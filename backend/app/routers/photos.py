from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile, File, Form, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
import uuid
import io
import logging
import mimetypes
import os
import zipfile
from datetime import datetime, timedelta
from PIL import Image, ImageOps
from ..database import get_db
from ..database import SessionLocal
from ..storage import BUCKET_NAME, storage_manager
from ..ai import ai_engine
from .. import models
from ..models import SystemSetting
from ..auth import CurrentUser, get_current_user, get_optional_current_user, is_super_admin
from ..audit import log_audit
from ..websocket_manager import manager
from .otp import consume_verified_token

router = APIRouter(prefix="/photos", tags=["photos"])
logger = logging.getLogger(__name__)

DEFAULT_STORAGE_QUOTA_GB = int(os.getenv("DEFAULT_STORAGE_QUOTA_GB", "50"))
DEFAULT_STORAGE_QUOTA_BYTES = DEFAULT_STORAGE_QUOTA_GB * 1024 * 1024 * 1024
BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
CLEANUP_FAILED_JOB_DAYS = int(os.getenv("CLEANUP_FAILED_JOB_DAYS", "7"))
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "75"))

class PhotoResponse(BaseModel):
    id: int
    event_id: str
    name: str
    preview_name: Optional[str] = ""
    preview_url: Optional[str] = ""
    original_url: Optional[str] = ""
    size: str
    size_bytes: Optional[int] = 0
    progress: int
    status: str
    faces_count: Optional[int] = 0

    class Config:
        from_attributes = True

class StorageSummaryResponse(BaseModel):
    used_bytes: int
    quota_bytes: int
    used: str
    quota: str
    percent: int

class StoragePolicyResponse(BaseModel):
    quota_per_photographer: str
    backup_retention_days: int
    cleanup_failed_job_days: int
    auto_archive_days: int
    delete_originals_after_days: int
    warning_threshold_percent: int
    critical_threshold_percent: int
    previews_only_after_cleanup: bool
    original_storage: str
    preview_storage: str
    client_delivery: str

class StoragePolicyUpdate(BaseModel):
    auto_archive_days: int = 45
    delete_originals_after_days: int = 90
    backup_retention_days: int = 30
    cleanup_failed_job_days: int = 7
    warning_threshold_percent: int = 80
    critical_threshold_percent: int = 95
    previews_only_after_cleanup: bool = True

class StorageCleanupRequest(BaseModel):
    dry_run: bool = True
    delete_originals_after_days: Optional[int] = None

class StorageCleanupResponse(BaseModel):
    dry_run: bool
    cutoff_days: int
    eligible_photos: int
    affected_events: int
    reclaimable_bytes: int
    reclaimable: str
    originals_deleted: int = 0

class StorageTenantRow(BaseModel):
    photographer_id: str
    photographer_name: str
    photographer_email: str
    quota_gb: int
    quota_bytes: int
    used_bytes: int
    used: str
    percent: int
    photo_count: int
    event_count: int
    status: str
    warning_level: str

class StorageReportResponse(BaseModel):
    total_used_bytes: int
    total_used: str
    total_quota_bytes: int
    total_quota: str
    free_bytes: int
    free: str
    percent: int
    warning_threshold_percent: int
    critical_threshold_percent: int
    tenants: List[StorageTenantRow]

class ClientAlbumRequest(BaseModel):
    client_name: str
    client_mobile: str
    verification_token: str

def _storage_url(key: str) -> str:
    if storage_manager.use_s3:
        if storage_manager.s3_client:
            from ..storage import ENDPOINT_URL, REGION_NAME
            if ENDPOINT_URL:
                return f"{ENDPOINT_URL}/{BUCKET_NAME}/{key}"
            return f"https://{BUCKET_NAME}.s3.{REGION_NAME}.amazonaws.com/{key}"
    return f"/static/uploads/{key}"

def _local_upload_path(key: str) -> str:
    return os.path.join("static", "uploads", key)

def _photo_original_key(photo: models.Photo) -> str:
    return f"photos/original/{photo.event_id}/{os.path.basename(photo.name)}"

def _photo_preview_key(photo: models.Photo) -> str:
    if photo.preview_name:
        return f"photos/preview/{photo.event_id}/{os.path.basename(photo.preview_name)}"
    return f"photos/{os.path.basename(photo.name)}"

def _photo_legacy_key(photo: models.Photo) -> str:
    return f"photos/{os.path.basename(photo.name)}"

def _photo_response(photo: models.Photo, faces_count: Optional[int] = None) -> dict:
    original_key = _photo_original_key(photo)
    preview_key = _photo_preview_key(photo)
    return {
        "id": photo.id,
        "event_id": photo.event_id,
        "name": photo.name,
        "preview_name": photo.preview_name or "",
        "preview_url": _storage_url(preview_key),
        "original_url": _storage_url(original_key),
        "size": photo.size,
        "size_bytes": photo.size_bytes or 0,
        "progress": photo.progress,
        "status": photo.status,
        "faces_count": faces_count if faces_count is not None else 0,
    }

def _format_size(size_bytes: int) -> str:
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    return f"{size_bytes / 1024:.0f} KB"

def _photographer_storage_usage(db: Session, photographer_id: str) -> int:
    used = (
        db.query(func.coalesce(func.sum(models.Photo.size_bytes), 0))
        .join(models.Event, models.Event.id == models.Photo.event_id)
        .filter(models.Event.photographer_id == photographer_id)
        .scalar()
    )
    return int(used or 0)

def _photographer_quota_bytes(photographer: Optional[models.User]) -> int:
    quota_gb = getattr(photographer, "storage_quota_gb", None) or 50
    return max(1, int(quota_gb)) * 1024 * 1024 * 1024

def _get_setting(db: Session, key: str, default: str) -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return setting.value if setting and setting.value != "" else default

def _set_setting(db: Session, key: str, value: str) -> None:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        db.add(SystemSetting(key=key, value=value))

def _get_int_setting(db: Session, key: str, default: int) -> int:
    try:
        return int(_get_setting(db, key, str(default)))
    except ValueError:
        return default

def _get_bool_setting(db: Session, key: str, default: bool) -> bool:
    return _get_setting(db, key, str(default)).strip().lower() in {"1", "true", "yes", "on"}

def _storage_policy_payload(db: Session) -> dict:
    auto_archive_days = _get_int_setting(db, "storage_auto_archive_days", 45)
    delete_originals_after_days = _get_int_setting(db, "storage_delete_originals_after_days", 90)
    backup_retention_days = _get_int_setting(db, "storage_backup_retention_days", BACKUP_RETENTION_DAYS)
    cleanup_failed_job_days = _get_int_setting(db, "storage_cleanup_failed_job_days", CLEANUP_FAILED_JOB_DAYS)
    warning_threshold_percent = _get_int_setting(db, "storage_warning_threshold_percent", 80)
    critical_threshold_percent = _get_int_setting(db, "storage_critical_threshold_percent", 95)
    previews_only_after_cleanup = _get_bool_setting(db, "storage_previews_only_after_cleanup", True)
    return {
        "quota_per_photographer": _format_size(DEFAULT_STORAGE_QUOTA_BYTES),
        "backup_retention_days": backup_retention_days,
        "cleanup_failed_job_days": cleanup_failed_job_days,
        "auto_archive_days": auto_archive_days,
        "delete_originals_after_days": delete_originals_after_days,
        "warning_threshold_percent": warning_threshold_percent,
        "critical_threshold_percent": critical_threshold_percent,
        "previews_only_after_cleanup": previews_only_after_cleanup,
        "original_storage": f"Original master files stay available for {delete_originals_after_days} days, then can be cleaned to save VPS disk.",
        "preview_storage": "Client and guest galleries use generated WebP previews from photos/preview/{event_id}/.",
        "client_delivery": "Client selection stores only photo IDs; selected ZIP needs original master files until cleanup.",
    }

def _assert_event_owner(event: models.Event, current_user: Optional[CurrentUser]) -> None:
    if current_user and is_super_admin(current_user):
        return
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if event.photographer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this event")

def _assert_photo_owner(db: Session, photo: models.Photo, current_user: Optional[CurrentUser]) -> None:
    if current_user and is_super_admin(current_user):
        return
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    event = db.query(models.Event).filter(models.Event.id == photo.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Photo event not found")
    _assert_event_owner(event, current_user)

def _refresh_event_stats(db: Session, event_id: str) -> None:
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        return
    total_photos_count = db.query(models.Photo).filter(models.Photo.event_id == event_id).count()
    event.photos = f"{total_photos_count:,}"

    total_faces_count = (
        db.query(models.Face)
        .join(models.Photo)
        .filter(models.Photo.event_id == event_id)
        .count()
    )
    event.guests = max(int(total_faces_count / 3), 1) if total_photos_count else 0

def _update_photo_job(db: Session, photo_id: int, status_value: str, progress: int) -> Optional[models.Photo]:
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        return None
    photo.status = status_value
    photo.progress = max(0, min(100, progress))
    db.commit()
    db.refresh(photo)
    return photo

def _run_ai_indexing_job(photo_id: int, image_bytes: Optional[bytes], fallback_image_bytes: Optional[bytes] = None) -> None:
    db = SessionLocal()
    try:
        photo = _update_photo_job(db, photo_id, "Processing", 55)
        if not photo:
            return
        if not image_bytes:
            photo.status = "Pending"
            photo.progress = 35
            db.commit()
            return

        db.query(models.Face).filter(models.Face.photo_id == photo_id).delete()
        db.commit()

        detected_faces = ai_engine.process_image(image_bytes)
        if not detected_faces and fallback_image_bytes:
            logger.info("Retrying AI indexing with preview fallback for photo_id=%s", photo_id)
            detected_faces = ai_engine.process_image(fallback_image_bytes)
        photo = _update_photo_job(db, photo_id, "Processing", 82)
        if not photo:
            return

        for face_data in detected_faces:
            bbox = face_data["bbox"]
            embedding = face_data["embedding"]
            new_face = models.Face(
                photo_id=photo_id,
                bbox_x1=bbox[0],
                bbox_y1=bbox[1],
                bbox_x2=bbox[2],
                bbox_y2=bbox[3],
            )
            new_face.set_embedding(embedding)
            db.add(new_face)

        photo.status = "Completed"
        photo.progress = 100
        _refresh_event_stats(db, photo.event_id)
        db.commit()
    except Exception:
        logger.exception("AI indexing failed for photo_id=%s", photo_id)
        try:
            _update_photo_job(db, photo_id, "Failed", 100)
        except Exception:
            logger.exception("AI job status update failed for photo_id=%s", photo_id)
    finally:
        db.close()

def _generate_preview_bytes(contents: bytes, max_px: int = 2400) -> bytes:
    with Image.open(io.BytesIO(contents)) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        img.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=82, method=6)
        return out.getvalue()

def _read_stored_photo(photo: models.Photo) -> tuple[str, bytes]:
    filename = os.path.basename(photo.name.split("?")[0]) or f"photo-{photo.id}.jpg"
    keys = [_photo_original_key(photo), _photo_legacy_key(photo)]
    if storage_manager.use_s3 and storage_manager.s3_client:
        for key in keys:
            try:
                obj = storage_manager.s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
                return filename, obj["Body"].read()
            except Exception:
                continue
        raise HTTPException(status_code=404, detail="Stored original photo not available")

    for key in keys:
        local_path = _local_upload_path(key)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return filename, f.read()
    raise HTTPException(status_code=404, detail="Stored original photo file not found")

@router.get("/storage/summary", response_model=StorageSummaryResponse)
def get_storage_summary(photographer_email: Optional[str] = None, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    used_bytes = 0
    quota_bytes = DEFAULT_STORAGE_QUOTA_BYTES
    if current_user and not is_super_admin(current_user):
        photographer = db.query(models.User).filter(models.User.id == current_user.id).first()
        if photographer:
            used_bytes = _photographer_storage_usage(db, photographer.id)
            quota_bytes = _photographer_quota_bytes(photographer)
    elif photographer_email and is_super_admin(current_user):
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if photographer:
            used_bytes = _photographer_storage_usage(db, photographer.id)
            quota_bytes = _photographer_quota_bytes(photographer)
    else:
        used_bytes = int(db.query(func.coalesce(func.sum(models.Photo.size_bytes), 0)).scalar() or 0)

    percent = round((used_bytes / quota_bytes) * 100) if quota_bytes else 0
    return {
        "used_bytes": used_bytes,
        "quota_bytes": quota_bytes,
        "used": _format_size(used_bytes),
        "quota": _format_size(quota_bytes),
        "percent": max(0, min(100, percent)),
    }

@router.get("/storage/policy", response_model=StoragePolicyResponse)
def get_storage_policy(db: Session = Depends(get_db)):
    return _storage_policy_payload(db)

@router.post("/storage/policy", response_model=StoragePolicyResponse)
def update_storage_policy(
    policy: StoragePolicyUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can update storage policy")
    values = {
        "storage_auto_archive_days": max(7, min(policy.auto_archive_days, 365)),
        "storage_delete_originals_after_days": max(7, min(policy.delete_originals_after_days, 730)),
        "storage_backup_retention_days": max(1, min(policy.backup_retention_days, 365)),
        "storage_cleanup_failed_job_days": max(1, min(policy.cleanup_failed_job_days, 90)),
        "storage_warning_threshold_percent": max(50, min(policy.warning_threshold_percent, 99)),
        "storage_critical_threshold_percent": max(60, min(policy.critical_threshold_percent, 100)),
        "storage_previews_only_after_cleanup": policy.previews_only_after_cleanup,
    }
    for key, value in values.items():
        _set_setting(db, key, str(value))
    db.commit()
    log_audit(
        db,
        action="storage_policy_updated",
        current_user=current_user,
        resource_type="system_setting",
        resource_id="storage_policy",
        request=request,
        details=values,
    )
    return _storage_policy_payload(db)

@router.get("/storage/report", response_model=StorageReportResponse)
def get_storage_report(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can view platform storage report")
    policy = _storage_policy_payload(db)
    warning_threshold = int(policy["warning_threshold_percent"])
    critical_threshold = int(policy["critical_threshold_percent"])
    photographers = db.query(models.User).filter(models.User.role == "Photographer").order_by(models.User.name.asc()).all()
    tenants = []
    total_used_bytes = 0
    total_quota_bytes = 0
    for photographer in photographers:
        used_bytes = _photographer_storage_usage(db, photographer.id)
        quota_bytes = _photographer_quota_bytes(photographer)
        event_count = db.query(models.Event).filter(models.Event.photographer_id == photographer.id).count()
        photo_count = (
            db.query(models.Photo)
            .join(models.Event, models.Event.id == models.Photo.event_id)
            .filter(models.Event.photographer_id == photographer.id)
            .count()
        )
        percent = round((used_bytes / quota_bytes) * 100) if quota_bytes else 0
        warning_level = "critical" if percent >= critical_threshold else "warning" if percent >= warning_threshold else "healthy"
        total_used_bytes += used_bytes
        total_quota_bytes += quota_bytes
        tenants.append({
            "photographer_id": photographer.id,
            "photographer_name": photographer.brand_name or photographer.name,
            "photographer_email": photographer.email,
            "quota_gb": int(getattr(photographer, "storage_quota_gb", None) or DEFAULT_STORAGE_QUOTA_GB),
            "quota_bytes": quota_bytes,
            "used_bytes": used_bytes,
            "used": _format_size(used_bytes),
            "percent": max(0, min(100, percent)),
            "photo_count": photo_count,
            "event_count": event_count,
            "status": photographer.status or "Active",
            "warning_level": warning_level,
        })
    free_bytes = max(0, total_quota_bytes - total_used_bytes)
    total_percent = round((total_used_bytes / total_quota_bytes) * 100) if total_quota_bytes else 0
    return {
        "total_used_bytes": total_used_bytes,
        "total_used": _format_size(total_used_bytes),
        "total_quota_bytes": total_quota_bytes,
        "total_quota": _format_size(total_quota_bytes),
        "free_bytes": free_bytes,
        "free": _format_size(free_bytes),
        "percent": max(0, min(100, total_percent)),
        "warning_threshold_percent": warning_threshold,
        "critical_threshold_percent": critical_threshold,
        "tenants": tenants,
    }

@router.post("/storage/cleanup-originals", response_model=StorageCleanupResponse)
def cleanup_old_originals(
    payload: StorageCleanupRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can cleanup originals")
    policy = _storage_policy_payload(db)
    cutoff_days = payload.delete_originals_after_days or int(policy["delete_originals_after_days"])
    cutoff_days = max(7, min(cutoff_days, 730))
    cutoff = datetime.utcnow() - timedelta(days=cutoff_days)
    eligible_photos = (
        db.query(models.Photo)
        .join(models.Event, models.Event.id == models.Photo.event_id)
        .filter(models.Photo.size_bytes > 0)
        .filter(
            (models.Event.status == "Archived") |
            (models.Photo.created_at <= cutoff)
        )
        .all()
    )
    reclaimable_bytes = int(sum(photo.size_bytes or 0 for photo in eligible_photos))
    affected_events = len({photo.event_id for photo in eligible_photos})
    deleted_count = 0
    if not payload.dry_run:
        for photo in eligible_photos:
            try:
                storage_manager.delete_file(_photo_original_key(photo))
                storage_manager.delete_file(_photo_legacy_key(photo))
            except Exception:
                logger.exception("Original cleanup skipped file %s", photo.name)
                continue
            photo.size_bytes = 0
            photo.size = "Preview only"
            deleted_count += 1
        db.commit()
        log_audit(
            db,
            action="storage_originals_cleanup",
            current_user=current_user,
            resource_type="photo",
            resource_id="originals",
            request=request,
            details={
                "dry_run": payload.dry_run,
                "cutoff_days": cutoff_days,
                "eligible_photos": len(eligible_photos),
                "deleted_count": deleted_count,
                "reclaimable_bytes": reclaimable_bytes,
            },
        )
    return {
        "dry_run": payload.dry_run,
        "cutoff_days": cutoff_days,
        "eligible_photos": len(eligible_photos),
        "affected_events": affected_events,
        "reclaimable_bytes": reclaimable_bytes,
        "reclaimable": _format_size(reclaimable_bytes),
        "originals_deleted": deleted_count,
    }

@router.post("/maintenance/cleanup")
def cleanup_failed_uploads(request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can run maintenance cleanup")
    cutoff = datetime.utcnow() - timedelta(days=CLEANUP_FAILED_JOB_DAYS)
    stale_photos = (
        db.query(models.Photo)
        .filter(models.Photo.status.in_(["Failed", "Pending"]))
        .filter(models.Photo.created_at.isnot(None))
        .filter(models.Photo.created_at < cutoff)
        .all()
    )
    deleted_count = 0
    affected_event_ids = set()
    for photo in stale_photos:
        affected_event_ids.add(photo.event_id)
        try:
            storage_manager.delete_file(_photo_original_key(photo))
            storage_manager.delete_file(_photo_preview_key(photo))
            storage_manager.delete_file(_photo_legacy_key(photo))
        except Exception:
            logger.exception("Cleanup skipped storage file %s", photo.name)
        db.delete(photo)
        deleted_count += 1

    db.commit()
    for event_id in affected_event_ids:
        _refresh_event_stats(db, event_id)
    db.commit()
    log_audit(
        db,
        action="photo_maintenance_cleanup",
        current_user=current_user,
        resource_type="photo",
        resource_id="cleanup",
        request=request,
        details={"deleted_count": deleted_count},
    )

    return {
        "deleted_count": deleted_count,
        "policy": f"Failed/Pending jobs older than {CLEANUP_FAILED_JOB_DAYS} days are cleaned up.",
    }

@router.get("/event/{event_id}", response_model=List[PhotoResponse])
def get_event_photos(event_id: str, limit: int = 2000, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    _assert_event_owner(event, current_user)
    limit = max(1, min(limit, 5000))
    photos = db.query(models.Photo).filter(models.Photo.event_id == event_id).order_by(models.Photo.id.desc()).limit(limit).all()
    face_counts = dict(
        db.query(models.Face.photo_id, func.count(models.Face.id))
        .join(models.Photo, models.Photo.id == models.Face.photo_id)
        .filter(models.Photo.event_id == event_id)
        .group_by(models.Face.photo_id)
        .all()
    )
    return [_photo_response(photo, int(face_counts.get(photo.id, 0))) for photo in photos]

@router.post("/client-album/{event_id}", response_model=List[PhotoResponse])
def get_client_album(event_id: str, payload: ClientAlbumRequest, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status == "Archived":
        raise HTTPException(status_code=403, detail="This event has been archived")

    registered_mobile = "".join(ch for ch in (event.client_mobile or "") if ch.isdigit())
    incoming_mobile = "".join(ch for ch in (payload.client_mobile or "") if ch.isdigit())
    registered_name = " ".join((event.client_name or "").strip().lower().split())
    incoming_name = " ".join((payload.client_name or "").strip().lower().split())
    if not registered_mobile or not registered_name:
        raise HTTPException(status_code=403, detail="Client selection is not configured for this event")
    if registered_mobile and registered_mobile != incoming_mobile:
        raise HTTPException(status_code=403, detail="Client mobile does not match this event")
    if registered_name and registered_name != incoming_name:
        raise HTTPException(status_code=403, detail="Client name does not match this event")
    if not consume_verified_token(payload.verification_token, event_id, incoming_mobile):
        raise HTTPException(status_code=403, detail="Verified client OTP session is required")

    photos = (
        db.query(models.Photo)
        .filter(models.Photo.event_id == event_id, models.Photo.status.in_(["Completed", "Processing", "Queued"]))
        .order_by(models.Photo.id.desc())
        .limit(2000)
        .all()
    )
    return [
        {**_photo_response(photo, 0), "original_url": ""}
        for photo in photos
    ]

@router.get("/download/{photo_id}")
def download_photo(photo_id: int, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    _assert_photo_owner(db, photo, current_user)

    filename, contents = _read_stored_photo(photo)
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    log_audit(
        db,
        action="photo_original_downloaded",
        current_user=current_user,
        resource_type="photo",
        resource_id=str(photo.id),
        request=request,
        details={"event_id": photo.event_id, "file_name": photo.name},
    )
    return StreamingResponse(
        io.BytesIO(contents),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/upload", response_model=PhotoResponse)
async def upload_photo(
    background_tasks: BackgroundTasks,
    request: Request,
    event_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    import os
    # Verify event exists
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    _assert_event_owner(event, current_user)
        
    contents = await file.read()
    size_bytes = len(contents)
    max_upload_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if size_bytes > max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"Photo must be {MAX_UPLOAD_SIZE_MB}MB or smaller for this pilot")
    size_str = _format_size(size_bytes)

    if event.photographer_id:
        photographer = db.query(models.User).filter(models.User.id == event.photographer_id).first()
        quota_bytes = _photographer_quota_bytes(photographer)
        used_bytes = _photographer_storage_usage(db, event.photographer_id)
        if used_bytes + size_bytes > quota_bytes:
            raise HTTPException(
                status_code=413,
                detail=(
                    "Storage quota exceeded. "
                    f"Used {_format_size(used_bytes)} of {_format_size(quota_bytes)}."
                ),
            )

    # Generate unique storage key based on original filename
    import re
    original_filename = file.filename if hasattr(file, 'filename') and file.filename else 'photo.jpg'
    base_name, file_ext = os.path.splitext(original_filename)
    if not file_ext:
        file_ext = ".jpg"
    
    # Sanitize base name for URL and filesystem compatibility
    safe_base_name = re.sub(r'\s+', '_', base_name)
    safe_base_name = re.sub(r'[^a-zA-Z0-9_\-]', '', safe_base_name)
    if not safe_base_name:
        safe_base_name = "photo"
        
    # Append short 6-char UUID to keep it unique while preserving name
    unique_filename = f"{safe_base_name}_{uuid.uuid4().hex[:6]}{file_ext}"
    original_key = f"photos/original/{event_id}/{unique_filename}"
    preview_filename = f"{safe_base_name}_{uuid.uuid4().hex[:6]}.webp"
    preview_key = f"photos/preview/{event_id}/{preview_filename}"
    preview_bytes_for_ai = None
    
    # 1. Upload to storage manager (S3 or local folder)
    try:
        storage_manager.upload_file(contents, original_key, is_path=False)
        try:
            preview_bytes = _generate_preview_bytes(contents)
            preview_bytes_for_ai = preview_bytes
            storage_manager.upload_file(preview_bytes, preview_key, is_path=False)
        except Exception:
            logger.exception("Preview generation skipped for %s", unique_filename)
            preview_filename = ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    # 2. Add Photo record to DB
    new_photo = models.Photo(
        event_id=event_id,
        name=unique_filename,
        preview_name=preview_filename,
        size=size_str,
        size_bytes=size_bytes,
        progress=35 if preview_filename else 25,
        status="Queued" if preview_filename else "Pending"
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    _refresh_event_stats(db, event_id)
    db.commit()
    log_audit(
        db,
        action="photo_uploaded",
        current_user=current_user,
        resource_type="photo",
        resource_id=str(new_photo.id),
        request=request,
        details={"event_id": event_id, "file_name": new_photo.name, "size_bytes": size_bytes},
    )
    background_tasks.add_task(_run_ai_indexing_job, new_photo.id, contents, preview_bytes_for_ai)

    # 3. Broadcast live preview update to guests connected via WebSockets
    try:
        await manager.broadcast_to_event(event_id, {
            "type": "NEW_PHOTOS",
            "count": 1,
            "event_id": event_id
        })
    except Exception:
        logger.exception("Error broadcasting WebSocket photo update for event_id=%s", event_id)

    return _photo_response(new_photo, 0)

@router.get("/indexing/jobs", response_model=List[PhotoResponse])
def get_indexing_jobs(photographer_email: Optional[str] = None, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if current_user and not is_super_admin(current_user):
        photos = db.query(models.Photo).join(models.Event).filter(
            models.Event.photographer_id == current_user.id
        ).order_by(models.Photo.id.desc()).limit(50).all()
        return [_photo_response(photo) for photo in photos]
    if photographer_email and is_super_admin(current_user):
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if photographer:
            photos = db.query(models.Photo).join(models.Event).filter(models.Event.photographer_id == photographer.id).order_by(models.Photo.id.desc()).limit(50).all()
            return [_photo_response(photo) for photo in photos]
    photos = db.query(models.Photo).order_by(models.Photo.id.desc()).limit(50).all()
    return [_photo_response(photo) for photo in photos]

class DeletePhotosRequest(BaseModel):
    photo_ids: List[int]

class DownloadZipRequest(BaseModel):
    photo_ids: List[int]

@router.post("/download-zip")
def download_photos_zip(zip_request: DownloadZipRequest, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not zip_request.photo_ids:
        raise HTTPException(status_code=400, detail="No photos selected")

    photos = db.query(models.Photo).filter(models.Photo.id.in_(zip_request.photo_ids)).all()
    if not photos:
        raise HTTPException(status_code=404, detail="No photos found")
    for photo in photos:
        _assert_photo_owner(db, photo, current_user)

    zip_buffer = io.BytesIO()
    added_count = 0
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for photo in photos:
            try:
                filename, contents = _read_stored_photo(photo)
                archive.writestr(filename, contents)
                added_count += 1
            except Exception:
                logger.exception("Skipping missing original photo %s", photo.name)

    zip_buffer.seek(0)
    if added_count == 0:
        raise HTTPException(status_code=404, detail="Selected photo files were not found")

    log_audit(
        db,
        action="photo_zip_downloaded",
        current_user=current_user,
        resource_type="photo_zip",
        resource_id=",".join(str(photo.id) for photo in photos[:20]),
        request=request,
        details={"requested_count": len(zip_request.photo_ids), "added_count": added_count},
    )

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="masterstudio-photos.zip"'},
    )

@router.delete("/delete", status_code=status.HTTP_200_OK)
def delete_photos(delete_request: DeletePhotosRequest, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not delete_request.photo_ids:
        return {"message": "No photos selected", "deleted_count": 0}
        
    photos_to_delete = db.query(models.Photo).filter(models.Photo.id.in_(delete_request.photo_ids)).all()
    if not photos_to_delete:
        raise HTTPException(status_code=404, detail="No photos found to delete")
    for photo in photos_to_delete:
        _assert_photo_owner(db, photo, current_user)
        
    event_ids_to_update = set()
    deleted_count = 0
    
    for photo in photos_to_delete:
        event_ids_to_update.add(photo.event_id)
        # 1. Delete physical file from storage
        try:
            storage_manager.delete_file(_photo_original_key(photo))
            storage_manager.delete_file(_photo_preview_key(photo))
            storage_manager.delete_file(_photo_legacy_key(photo))
        except Exception:
            logger.exception("Error deleting storage file %s", photo.name)
            
        # 2. Delete photo from DB (will cascade-delete faces)
        db.delete(photo)
        deleted_count += 1
        
    db.commit()
    
    # 3. Update Event stats (photos count & guests count)
    for event_id in event_ids_to_update:
        event = db.query(models.Event).filter(models.Event.id == event_id).first()
        if event:
            total_photos_count = db.query(models.Photo).filter(models.Photo.event_id == event_id).count()
            event.photos = f"{total_photos_count:,}"
            
            total_faces_count = db.query(models.Face).join(models.Photo).filter(models.Photo.event_id == event_id).count()
            event.guests = max(int(total_faces_count / 3), 1)
            
    db.commit()
    log_audit(
        db,
        action="photos_deleted",
        current_user=current_user,
        resource_type="photo",
        resource_id=",".join(str(photo_id) for photo_id in delete_request.photo_ids[:20]),
        request=request,
        details={"deleted_count": deleted_count, "event_ids": sorted(event_ids_to_update)},
    )
    
    return {"message": f"Successfully deleted {deleted_count} photos", "deleted_count": deleted_count}
