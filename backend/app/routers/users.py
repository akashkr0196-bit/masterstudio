from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, field_serializer
from typing import List, Optional
import os
import uuid
import json
import logging

from ..database import get_db
from ..storage import storage_manager
from .. import models
from ..auth import CurrentUser, create_access_token, get_current_user, get_optional_current_user, is_super_admin
from ..audit import log_audit
from ..security import (
    get_login_lock_seconds,
    hash_password,
    is_password_hash,
    login_rate_limit_key,
    record_login_failure,
    record_login_success,
    verify_password,
)

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)

class UserCreate(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = ""
    plan: Optional[str] = "Premium"
    status: Optional[str] = "Active"
    brand_name: Optional[str] = ""
    password: Optional[str] = ""
    temp_password: Optional[str] = None
    must_change_password: Optional[bool] = False
    first_login_done: Optional[bool] = False
    verification_status: Optional[str] = "Pending Verification"
    storage_quota_gb: Optional[int] = 50

class UserUpdate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    plan: Optional[str] = "Premium"
    status: Optional[str] = "Active"
    brand_name: Optional[str] = ""
    brand_rights_text: Optional[str] = ""
    instagram_url: Optional[str] = ""
    facebook_url: Optional[str] = ""
    website_url: Optional[str] = ""
    whatsapp_url: Optional[str] = ""
    address: Optional[str] = ""
    about_studio: Optional[str] = ""
    password: Optional[str] = ""
    temp_password: Optional[str] = ""
    must_change_password: Optional[bool] = None
    first_login_done: Optional[bool] = None
    verification_status: Optional[str] = None
    storage_quota_gb: Optional[int] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = ""
    avatar_url: Optional[str] = ""
    brand_logo_url: Optional[str] = ""
    brand_name: Optional[str] = ""
    brand_rights_text: Optional[str] = ""
    instagram_url: Optional[str] = ""
    facebook_url: Optional[str] = ""
    website_url: Optional[str] = ""
    whatsapp_url: Optional[str] = ""
    address: Optional[str] = ""
    about_studio: Optional[str] = ""
    verification_status: Optional[str] = "Pending Verification"
    brand_change_request: Optional[str] = ""
    events_count: int
    joined: str
    plan: str
    status: str
    storage_quota_gb: Optional[int] = 50
    must_change_password: Optional[bool] = False
    first_login_done: Optional[bool] = False
    password: Optional[str] = ""
    temp_password: Optional[str] = ""

    class Config:
        from_attributes = True

    @field_serializer("password", "temp_password")
    def hide_password_fields(self, value: str) -> str:
        return ""

class DownloadCreate(BaseModel):
    guest: str
    event: str
    photo: str
    size: str

class BrandChangeRequest(BaseModel):
    requested_brand_name: Optional[str] = ""
    reason: Optional[str] = ""

class BrandVerificationUpdate(BaseModel):
    verification_status: str

class BrandChangeReview(BaseModel):
    action: str

class DownloadResponse(BaseModel):
    id: int
    guest: str
    event: str
    photo: str
    size: str
    time: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[UserResponse])
def get_users(photographer_email: Optional[str] = None, db: Session = Depends(get_db), current_user: Optional[CurrentUser] = Depends(get_optional_current_user)):
    if not current_user:
        return []

    if not is_super_admin(current_user) and not photographer_email:
        user = db.query(models.User).filter(models.User.id == current_user.id).first()
        if not user:
            return []
        if user.role == "Photographer":
            user.events_count = db.query(models.Event).filter(models.Event.photographer_id == user.id).count()
        return [user]

    users = db.query(models.User).all() if is_super_admin(current_user) else []
    # Calculate dynamic events_count for Photographers
    for u in users:
        if u.role == "Photographer":
            u.events_count = db.query(models.Event).filter(models.Event.photographer_id == u.id).count()

    if photographer_email:
        photographer = db.query(models.User).filter(models.User.id == current_user.id).first()
        if is_super_admin(current_user):
            photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if photographer:
            event_ids = [e.id for e in db.query(models.Event).filter(models.Event.photographer_id == photographer.id).all()]
            guests = db.query(models.GuestAccess).filter(models.GuestAccess.event_id.in_(event_ids)).all()
            return [
                {
                    "id": f"G-{g.id}",
                    "name": g.name,
                    "email": g.mobile,
                    "role": "Guest",
                    "phone": g.mobile,
                    "avatar_url": "",
                    "brand_logo_url": "",
                    "brand_name": "",
                    "brand_rights_text": "",
                    "instagram_url": "",
                    "facebook_url": "",
                    "website_url": "",
                    "whatsapp_url": "",
                    "address": "",
                    "about_studio": "",
                    "verification_status": "Verified",
                    "brand_change_request": "",
                    "events_count": 1,
                    "joined": g.created_at.strftime("%b %Y") if g.created_at else "",
                    "plan": "Guest Access",
                    "status": "Active",
                    "storage_quota_gb": 0,
                }
                for g in guests
            ]

    return users

@router.post("/", response_model=UserResponse)
def create_user(user_data: UserCreate, request: Request, db: Session = Depends(get_db), current_user: Optional[CurrentUser] = Depends(get_optional_current_user)):
    requested_role = (user_data.role or "Photographer").strip()
    if current_user:
        if not is_super_admin(current_user) and requested_role.lower() in {"super_admin", "admin"}:
            raise HTTPException(status_code=403, detail="You cannot create privileged accounts")
    else:
        if requested_role.lower() not in {"photographer"}:
            raise HTTPException(status_code=403, detail="Public registration is only available for photographers")

    db_user = db.query(models.User).filter(func.lower(models.User.email) == func.lower(user_data.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email is already registered")
        
    is_public_registration = current_user is None
    plan = "Launch Trial" if is_public_registration else (user_data.plan or "Premium")
    account_status = "Pending Approval" if is_public_registration else (user_data.status or "Active")
    storage_quota_gb = 50 if is_public_registration else max(1, int(user_data.storage_quota_gb or 50))
    verification_status = "Pending Verification" if is_public_registration else (
        user_data.verification_status if user_data.verification_status else ("Pending Verification" if requested_role == "Photographer" else "Verified")
    )

    new_user = models.User(
        id=user_data.id,
        name=user_data.name,
        email=user_data.email,
        role=requested_role,
        phone=user_data.phone or "",
        events_count=0,
        plan=plan,
        status=account_status,
        storage_quota_gb=storage_quota_gb,
        verification_status=verification_status,
        brand_name=user_data.brand_name or "",
        password=hash_password(user_data.password or ""),
        temp_password=hash_password(user_data.temp_password or ""),
        must_change_password=user_data.must_change_password or False,
        first_login_done=user_data.first_login_done or False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_audit(
        db,
        action="user_created",
        current_user=current_user,
        actor_email="" if current_user else "public_registration",
        actor_role="" if current_user else "public",
        resource_type="user",
        resource_id=new_user.id,
        request=request,
        details={"target_email": new_user.email, "target_role": new_user.role, "plan": new_user.plan},
    )

    if new_user.role == "Photographer":
        try:
            method_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "whatsapp_method").first()
            if method_setting and method_setting.value == "Automated":
                template_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "whatsapp_template_id").first()
                logger.info(
                    "WhatsApp welcome dispatch requested for user_id=%s template=%s",
                    new_user.id,
                    template_setting.value if template_setting else "",
                )
        except Exception:
            logger.exception("Failed to queue WhatsApp welcome notification for user_id=%s", new_user.id)

    return new_user

@router.post("/{user_id}/avatar", response_model=UserResponse)
async def upload_avatar(user_id: str, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not is_super_admin(current_user) and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="You can only upload your own avatar")

    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Profile photo must be an image")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Profile photo must be 5MB or smaller")

    file_ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    if file_ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Supported formats: JPG, PNG, WEBP")

    storage_key = f"avatars/{user_id}-{uuid.uuid4().hex}{file_ext}"
    avatar_url = storage_manager.upload_file(contents, storage_key, is_path=False)
    user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/brand-logo", response_model=UserResponse)
async def upload_brand_logo(user_id: str, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not is_super_admin(current_user) and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="You can only upload your own brand logo")

    if user.role not in {"Photographer", "Admin"}:
        raise HTTPException(status_code=403, detail="Only photographers can upload a brand logo")

    if user.verification_status == "Verified":
        raise HTTPException(status_code=403, detail="Verified brand logo is locked. Submit a brand change request for admin review.")

    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Brand logo must be an image")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Brand logo must be 5MB or smaller")

    file_ext = os.path.splitext(file.filename or "")[1].lower() or ".png"
    if file_ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Supported formats: JPG, PNG, WEBP")

    storage_key = f"brand-logos/{user_id}-{uuid.uuid4().hex}{file_ext}"
    brand_logo_url = storage_manager.upload_file(contents, storage_key, is_path=False)
    user.brand_logo_url = brand_logo_url
    db.commit()
    db.refresh(user)
    log_audit(
        db,
        action="brand_logo_uploaded",
        current_user=current_user,
        resource_type="user",
        resource_id=user.id,
        request=request,
        details={"file_name": file.filename or "", "target_email": user.email},
    )
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, user_data: UserUpdate, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not is_super_admin(current_user) and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="You can only update your own account")
        
    # Check email uniqueness if email is changing
    if user_data.email.lower() != user.email.lower():
        existing = db.query(models.User).filter(func.lower(models.User.email) == func.lower(user_data.email)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already in use")
            
    if user.verification_status == "Verified":
        requested_brand_name = (user_data.brand_name or "").strip()
        current_brand_name = (user.brand_name or "").strip()
        if requested_brand_name != current_brand_name:
            raise HTTPException(status_code=403, detail="Verified brand name is locked. Submit a brand change request for admin review.")
        if (user_data.phone or "") != (user.phone or ""):
            raise HTTPException(status_code=403, detail="Registered mobile number is locked after brand verification.")

    previous = {
        "email": user.email,
        "plan": user.plan,
        "status": user.status,
        "storage_quota_gb": user.storage_quota_gb,
        "verification_status": user.verification_status,
    }

    # --- Safe fields: any authenticated user can update their own profile ---
    user.name = user_data.name
    user.email = user_data.email
    user.phone = user_data.phone or ""
    user.brand_name = user_data.brand_name or ""
    user.brand_rights_text = user_data.brand_rights_text or ""
    user.instagram_url = user_data.instagram_url or ""
    user.facebook_url = user_data.facebook_url or ""
    user.website_url = user_data.website_url or ""
    user.whatsapp_url = user_data.whatsapp_url or ""
    user.address = user_data.address or ""
    user.about_studio = user_data.about_studio or ""

    # --- Privileged fields: super_admin only ---
    if is_super_admin(current_user):
        user.plan = user_data.plan
        user.status = user_data.status
        if user_data.storage_quota_gb is not None:
            user.storage_quota_gb = max(1, int(user_data.storage_quota_gb))
        if user_data.verification_status is not None:
            user.verification_status = user_data.verification_status
        if user_data.temp_password is not None:
            user.temp_password = hash_password(user_data.temp_password) if user_data.temp_password else ""
        if user_data.must_change_password is not None:
            user.must_change_password = user_data.must_change_password

    # --- Password change: allowed for own account (already ownership-checked above) ---
    if user_data.password:
        user.password = hash_password(user_data.password)
        user.temp_password = ""
        user.must_change_password = False
    if user_data.first_login_done is not None:
        user.first_login_done = user_data.first_login_done

    db.commit()
    db.refresh(user)
    changes = {
        key: {"from": value, "to": getattr(user, key)}
        for key, value in previous.items()
        if str(value) != str(getattr(user, key))
    }
    log_audit(
        db,
        action="user_updated",
        current_user=current_user,
        resource_type="user",
        resource_id=user.id,
        request=request,
        details={"target_email": user.email, "changes": changes},
    )
    return user

@router.post("/{user_id}/brand-change-request", response_model=UserResponse)
def request_brand_change(user_id: str, change_request: BrandChangeRequest, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not is_super_admin(current_user) and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="You can only request changes for your own account")
    if user.role not in {"Photographer", "Admin"}:
        raise HTTPException(status_code=403, detail="Only photographers can request brand changes")

    payload = {
        "requested_brand_name": (change_request.requested_brand_name or "").strip(),
        "reason": (change_request.reason or "").strip(),
    }
    if not payload["requested_brand_name"]:
        raise HTTPException(status_code=400, detail="Requested brand name is required")

    user.brand_change_request = json.dumps(payload)
    db.commit()
    db.refresh(user)
    log_audit(
        db,
        action="brand_change_requested",
        current_user=current_user,
        resource_type="user",
        resource_id=user.id,
        request=request,
        details={"target_email": user.email, "requested_brand_name": payload["requested_brand_name"]},
    )
    return user

@router.post("/{user_id}/verification", response_model=UserResponse)
def update_brand_verification(user_id: str, verification_request: BrandVerificationUpdate, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can update verification")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in {"Photographer", "Admin"}:
        raise HTTPException(status_code=403, detail="Only photographer/admin brand identity can be verified")
    if verification_request.verification_status not in {"Pending Verification", "Verified", "Rejected"}:
        raise HTTPException(status_code=400, detail="Invalid verification status")

    previous_status = user.verification_status
    user.verification_status = verification_request.verification_status
    db.commit()
    db.refresh(user)
    log_audit(
        db,
        action="brand_verification_updated",
        current_user=current_user,
        resource_type="user",
        resource_id=user.id,
        request=request,
        details={"target_email": user.email, "from": previous_status, "to": user.verification_status},
    )
    return user

@router.post("/{user_id}/brand-change-review", response_model=UserResponse)
def review_brand_change(user_id: str, review_request: BrandChangeReview, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can review brand changes")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.brand_change_request:
        raise HTTPException(status_code=400, detail="No brand change request is pending")

    action = review_request.action.lower().strip()
    if action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="Action must be approve or reject")

    if action == "approve":
        payload = json.loads(user.brand_change_request)
        user.brand_name = payload.get("requested_brand_name", user.brand_name)
        user.verification_status = "Verified"

    user.brand_change_request = ""
    db.commit()
    db.refresh(user)
    log_audit(
        db,
        action=f"brand_change_{action}d",
        current_user=current_user,
        resource_type="user",
        resource_id=user.id,
        request=request,
        details={"target_email": user.email, "brand_name": user.brand_name},
    )
    return user

@router.delete("/{user_id}")
def delete_user(user_id: str, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can delete users")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    target_email = user.email
    target_role = user.role
    db.delete(user)
    db.commit()
    log_audit(
        db,
        action="user_deleted",
        current_user=current_user,
        resource_type="user",
        resource_id=user_id,
        request=request,
        details={"target_email": target_email, "target_role": target_role},
    )
    return {"message": "User deleted successfully"}

@router.post("/downloads", response_model=DownloadResponse)
def log_download(dl_data: DownloadCreate, db: Session = Depends(get_db)):
    clean_guest = (dl_data.guest or "").strip()[:120]
    clean_event = (dl_data.event or "").strip()[:160]
    clean_photo = (dl_data.photo or "").strip()[:240]
    clean_size = (dl_data.size or "").strip()[:40]
    if not clean_guest or not clean_event or not clean_photo:
        raise HTTPException(status_code=400, detail="Guest, event, and photo are required")

    event = db.query(models.Event).filter(models.Event.name == clean_event).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found for download log")
    photo = db.query(models.Photo).filter(
        models.Photo.event_id == event.id,
        models.Photo.name == clean_photo,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found for download log")

    new_dl = models.Download(
        guest=clean_guest,
        event=clean_event,
        photo=clean_photo,
        size=clean_size
    )
    db.add(new_dl)
    db.commit()
    db.refresh(new_dl)
    return new_dl

@router.get("/downloads", response_model=List[DownloadResponse])
def get_all_downloads(photographer_email: Optional[str] = None, limit: int = 500, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    limit = max(1, min(limit, 1000))
    if not is_super_admin(current_user):
        events = db.query(models.Event).filter(models.Event.photographer_id == current_user.id).all()
        event_names = [e.name for e in events]
        return db.query(models.Download).filter(models.Download.event.in_(event_names)).order_by(models.Download.id.desc()).limit(limit).all() if event_names else []
    if photographer_email:
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if photographer:
            event_names = [e.name for e in db.query(models.Event).filter(models.Event.photographer_id == photographer.id).all()]
            return db.query(models.Download).filter(models.Download.event.in_(event_names)).order_by(models.Download.id.desc()).limit(limit).all()

    return db.query(models.Download).order_by(models.Download.id.desc()).limit(limit).all()

@router.get("/downloads/{guest_email}", response_model=List[DownloadResponse])
def get_user_downloads(guest_email: str, limit: int = 200, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user) and current_user.email.lower() != guest_email.strip().lower():
        raise HTTPException(status_code=403, detail="You can only view your own downloads")
    limit = max(1, min(limit, 500))
    downloads = db.query(models.Download).filter(models.Download.guest == guest_email).order_by(models.Download.id.desc()).limit(limit).all()
    return downloads

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = ""
    role: Optional[str] = "photographer"

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    session_id: Optional[str] = ""

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    requested_role = (req.role or "photographer").strip().lower()
    ip_address = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if not ip_address and request.client:
        ip_address = request.client.host
    rate_key = login_rate_limit_key(ip_address, email)
    locked_for = get_login_lock_seconds(rate_key)
    if locked_for > 0:
        log_audit(
            db,
            action="login_rate_limited",
            actor_email=email,
            actor_role=requested_role,
            resource_type="session",
            result="failed",
            request=request,
            details={"requested_role": requested_role, "locked_for_seconds": locked_for},
        )
        raise HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {locked_for} seconds.")

    if requested_role == "super_admin":
        super_admin_password = os.getenv("SUPER_ADMIN_PASSWORD", "")
        super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@masterstudio.in").strip().lower()
        allowed_super_admin_emails = {super_admin_email, "admin"}
        if not super_admin_password:
            raise HTTPException(status_code=500, detail="SUPER_ADMIN_PASSWORD is not configured")
        if email not in allowed_super_admin_emails or not verify_password(req.password or "", super_admin_password):
            record_login_failure(rate_key)
            log_audit(
                db,
                action="login_failed",
                actor_email=email,
                actor_role="super_admin",
                resource_type="session",
                result="failed",
                request=request,
            details={"requested_role": requested_role, "reason": "invalid_super_admin_credentials"},
            )
            raise HTTPException(status_code=401, detail="Invalid super admin credentials")
        record_login_success(rate_key)
        log_audit(
            db,
            action="login_success",
            actor_id="__super_admin__",
            actor_email=super_admin_email,
            actor_role="super_admin",
            resource_type="session",
            request=request,
            details={"requested_role": requested_role},
        )
        return LoginResponse(
            access_token=create_access_token("__super_admin__", super_admin_email, "super_admin"),
            role="super_admin",
            email=super_admin_email,
            session_id="",
        )

    if requested_role == "user":
        raise HTTPException(status_code=403, detail="Guest login is disabled. Please scan the event QR code and verify with mobile OTP.")

    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if not user:
        record_login_failure(rate_key)
        log_audit(
            db,
            action="login_failed",
            actor_email=email,
            actor_role=requested_role,
            resource_type="session",
            result="failed",
            request=request,
            details={"requested_role": requested_role, "reason": "user_not_found"},
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_role = (user.role or "").lower()
    if requested_role == "photographer" and user_role != "photographer":
        record_login_failure(rate_key)
        log_audit(
            db,
            action="login_failed",
            actor_id=user.id,
            actor_email=user.email,
            actor_role=user.role,
            resource_type="session",
            result="failed",
            request=request,
            details={"requested_role": requested_role, "reason": "role_mismatch"},
        )
        raise HTTPException(status_code=403, detail="This account is not a photographer")
    if requested_role == "user" and user_role not in {"guest", "client"}:
        record_login_failure(rate_key)
        log_audit(
            db,
            action="login_failed",
            actor_id=user.id,
            actor_email=user.email,
            actor_role=user.role,
            resource_type="session",
            result="failed",
            request=request,
            details={"requested_role": requested_role, "reason": "role_mismatch"},
        )
        raise HTTPException(status_code=403, detail="This account is not a guest/client")

    stored_password = user.password or ""
    temp_password = user.temp_password or ""
    password_matches = verify_password(req.password or "", stored_password) if stored_password else False
    temp_matches = verify_password(req.password or "", temp_password) if temp_password else False
    if (stored_password or temp_password) and not (password_matches or temp_matches):
        record_login_failure(rate_key)
        log_audit(
            db,
            action="login_failed",
            actor_id=user.id,
            actor_email=user.email,
            actor_role=user.role,
            resource_type="session",
            result="failed",
            request=request,
            details={"requested_role": requested_role, "reason": "invalid_password"},
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if password_matches and stored_password and not is_password_hash(stored_password):
        user.password = hash_password(req.password or "")
    if temp_matches and temp_password and not is_password_hash(temp_password):
        user.temp_password = hash_password(req.password or "")

    new_session_id = str(uuid.uuid4())
    user.active_session_id = new_session_id
    db.commit()
    record_login_success(rate_key)
    resolved_role = "photographer" if user_role == "photographer" else "user"
    log_audit(
        db,
        action="login_success",
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        resource_type="session",
        request=request,
        details={"requested_role": requested_role, "resolved_role": resolved_role},
    )
    return LoginResponse(
        access_token=create_access_token(user.id, user.email, user.role),
        role=resolved_role,
        email=user.email,
        session_id=new_session_id,
    )

@router.get("/check-session")
def check_session(
    email: str,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    email = email.strip().lower()

    # Ensure the authenticated user can only check their own session
    if current_user.email.lower() != email:
        return {"valid": False}

    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if not user:
        return {"valid": False}

    # Read-only check — never bootstrap a session_id from this endpoint
    return {"valid": user.active_session_id == session_id}
