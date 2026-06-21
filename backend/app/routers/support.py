from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import ContactMessage, SystemSetting
from ..auth import CurrentUser, get_current_user, is_super_admin
from ..audit import log_audit

router = APIRouter(
    prefix="/support",
    tags=["support"],
)

class ContactCreate(BaseModel):
    name: str
    email: str
    message: str

class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    message: str
    date: str

    class Config:
        from_attributes = True

class WhatsAppSettings(BaseModel):
    method: str  # "Manual" or "Automated"
    provider: str = "Fast2SMS"
    enabled: bool = False
    api_token: str = ""
    phone_number_id: str = ""
    business_account_id: str = ""
    welcome_template_name: str = ""
    otp_template_name: str = ""
    gallery_template_name: str = ""
    language_code: str = "en_US"
    daily_limit: int = 100
    test_mobile: str = ""
    notify_photographer_approval: bool = True
    notify_guest_otp: bool = False
    notify_gallery_ready: bool = False
    notes: str = ""

@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_support_message(message_data: ContactCreate, db: Session = Depends(get_db)):
    try:
        new_msg = ContactMessage(
            name=message_data.name,
            email=message_data.email,
            message=message_data.message
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)
        return new_msg
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit message: {str(e)}"
        )

@router.get("/", response_model=List[ContactResponse])
def get_support_messages(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admin can view support messages")
    try:
        return db.query(ContactMessage).order_by(ContactMessage.id.desc()).all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch support messages: {str(e)}"
        )

@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_support_message(message_id: int, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admin can delete support messages")
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    try:
        db.delete(msg)
        db.commit()
        log_audit(
            db,
            action="support_message_deleted",
            current_user=current_user,
            resource_type="support_message",
            resource_id=str(message_id),
            request=request,
        )
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete message: {str(e)}"
        )

@router.get("/settings/whatsapp", response_model=WhatsAppSettings)
def get_whatsapp_settings(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admin can view WhatsApp settings")
    method_setting = db.query(SystemSetting).filter(SystemSetting.key == "whatsapp_method").first()
    settings = {
        setting.key: setting.value
        for setting in db.query(SystemSetting).filter(SystemSetting.key.like("whatsapp_%")).all()
    }

    def setting_bool(key: str, default: bool = False) -> bool:
        value = settings.get(key)
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "on"}

    def setting_int(key: str, default: int) -> int:
        try:
            return int(settings.get(key, str(default)))
        except ValueError:
            return default

    return WhatsAppSettings(
        method=method_setting.value if method_setting else settings.get("whatsapp_method", "Manual"),
        provider=settings.get("whatsapp_provider", "Fast2SMS"),
        enabled=setting_bool("whatsapp_enabled", False),
        api_token=settings.get("whatsapp_api_token", ""),
        phone_number_id=settings.get("whatsapp_phone_number_id", ""),
        business_account_id=settings.get("whatsapp_business_account_id", ""),
        welcome_template_name=settings.get("whatsapp_welcome_template_name", settings.get("whatsapp_template_id", "")),
        otp_template_name=settings.get("whatsapp_otp_template_name", ""),
        gallery_template_name=settings.get("whatsapp_gallery_template_name", ""),
        language_code=settings.get("whatsapp_language_code", "en_US"),
        daily_limit=setting_int("whatsapp_daily_limit", 100),
        test_mobile=settings.get("whatsapp_test_mobile", ""),
        notify_photographer_approval=setting_bool("whatsapp_notify_photographer_approval", True),
        notify_guest_otp=setting_bool("whatsapp_notify_guest_otp", False),
        notify_gallery_ready=setting_bool("whatsapp_notify_gallery_ready", False),
        notes=settings.get("whatsapp_notes", ""),
    )

@router.post("/settings/whatsapp", response_model=WhatsAppSettings)
def save_whatsapp_settings(settings: WhatsAppSettings, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admin can update WhatsApp settings")
    for key, val in [
        ("whatsapp_method", settings.method),
        ("whatsapp_provider", settings.provider),
        ("whatsapp_enabled", str(settings.enabled)),
        ("whatsapp_api_token", settings.api_token),
        ("whatsapp_phone_number_id", settings.phone_number_id),
        ("whatsapp_business_account_id", settings.business_account_id),
        ("whatsapp_template_id", settings.welcome_template_name),
        ("whatsapp_welcome_template_name", settings.welcome_template_name),
        ("whatsapp_otp_template_name", settings.otp_template_name),
        ("whatsapp_gallery_template_name", settings.gallery_template_name),
        ("whatsapp_language_code", settings.language_code),
        ("whatsapp_daily_limit", str(settings.daily_limit)),
        ("whatsapp_test_mobile", "".join(ch for ch in settings.test_mobile if ch.isdigit())),
        ("whatsapp_notify_photographer_approval", str(settings.notify_photographer_approval)),
        ("whatsapp_notify_guest_otp", str(settings.notify_guest_otp)),
        ("whatsapp_notify_gallery_ready", str(settings.notify_gallery_ready)),
        ("whatsapp_notes", settings.notes),
    ]:
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting:
            setting.value = val
        else:
            setting = SystemSetting(key=key, value=val)
            db.add(setting)
    try:
        db.commit()
        log_audit(
            db,
            action="whatsapp_settings_updated",
            current_user=current_user,
            resource_type="system_setting",
            resource_id="whatsapp",
            request=request,
            details={
                "method": settings.method,
                "provider": settings.provider,
                "enabled": settings.enabled,
                "has_api_token": bool(settings.api_token),
                "daily_limit": settings.daily_limit,
                "notify_photographer_approval": settings.notify_photographer_approval,
                "notify_guest_otp": settings.notify_guest_otp,
                "notify_gallery_ready": settings.notify_gallery_ready,
            },
        )
        return settings
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save settings: {str(e)}"
        )
