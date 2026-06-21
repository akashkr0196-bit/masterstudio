from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from pydantic import BaseModel
from typing import List, Optional
import uuid
import numpy as np
import os
from datetime import datetime, timedelta
from ..database import get_db, HAS_PGVECTOR
from ..storage import storage_manager
from ..ai import ai_engine
from .. import models
from ..auth import CurrentUser, get_current_user, is_super_admin
from .otp import consume_verified_token

router = APIRouter(prefix="/search", tags=["search"])

def _read_float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default

def _read_int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default

AI_MATCH_THRESHOLD = max(0.1, min(_read_float_env("AI_MATCH_THRESHOLD", 0.45), 0.95))
AI_FALLBACK_MATCH_THRESHOLD = max(0.1, min(_read_float_env("AI_FALLBACK_MATCH_THRESHOLD", 0.38), AI_MATCH_THRESHOLD))
AI_RELATIVE_MATCH_MARGIN = max(0.05, min(_read_float_env("AI_RELATIVE_MATCH_MARGIN", 0.18), 0.35))
AI_MAX_MATCHES = max(1, min(_read_int_env("AI_MAX_MATCHES", 300), 1000))
AI_GUEST_FACE_CANDIDATES = max(1, min(_read_int_env("AI_GUEST_FACE_CANDIDATES", 2), 5))

class MatchResponse(BaseModel):
    photo_id: int
    name: str
    url: str
    similarity: float
    size: str

class SearchResponse(BaseModel):
    search_log_id: str
    guest: str
    event: str
    status: str
    matches: List[MatchResponse]

def build_photo_match(photo: models.Photo, similarity: float) -> dict:
    if photo.name.startswith("http://") or photo.name.startswith("https://"):
        photo_url = photo.name
    else:
        preview_name = getattr(photo, "preview_name", "") or ""
        if preview_name:
            photo_url = f"/static/uploads/photos/preview/{photo.event_id}/{preview_name}"
        else:
            photo_url = f"/static/uploads/photos/{photo.name}"
        if storage_manager.use_s3:
            from ..storage import BUCKET_NAME, ENDPOINT_URL, REGION_NAME
            key = f"photos/preview/{photo.event_id}/{preview_name}" if preview_name else f"photos/{photo.name}"
            photo_url = f"https://{BUCKET_NAME}.s3.{REGION_NAME}.amazonaws.com/{key}"
            if ENDPOINT_URL:
                photo_url = f"{ENDPOINT_URL}/{BUCKET_NAME}/{key}"

    clean_name = photo.name.split("/")[-1].split("?")[0]
    return {
        "photo_id": photo.id,
        "name": clean_name,
        "url": photo_url,
        "similarity": similarity,
        "size": photo.size
    }

def _build_adaptive_matches(guest_embeddings: list[list[float]], db_faces: list[models.Face]) -> list[dict]:
    best_by_photo: dict[int, dict] = {}

    for face in db_faces:
        face_emb = face.get_embedding()
        if face_emb is None or len(face_emb) == 0:
            continue

        similarity = max(
            ai_engine.compute_similarity(guest_embedding, face_emb)
            for guest_embedding in guest_embeddings
        )
        photo = face.photo
        existing_match = best_by_photo.get(photo.id)
        if not existing_match or similarity > existing_match["similarity"]:
            best_by_photo[photo.id] = build_photo_match(photo, similarity)

    if not best_by_photo:
        return []

    best_similarity = max(match["similarity"] for match in best_by_photo.values())
    adaptive_threshold = max(
        AI_FALLBACK_MATCH_THRESHOLD,
        min(AI_MATCH_THRESHOLD, best_similarity - AI_RELATIVE_MATCH_MARGIN),
    )

    matches = [
        match
        for match in best_by_photo.values()
        if match["similarity"] >= AI_MATCH_THRESHOLD
        or (best_similarity >= AI_MATCH_THRESHOLD and match["similarity"] >= adaptive_threshold)
    ]
    return sorted(matches, key=lambda x: x["similarity"], reverse=True)[:AI_MAX_MATCHES]

@router.get("/logs", response_model=List[dict])
def get_search_logs(photographer_email: Optional[str] = None, limit: int = 500, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    # Normalize empty string to None
    if photographer_email == "":
        photographer_email = None
    limit = max(1, min(limit, 1000))

    if current_user and not is_super_admin(current_user):
        events = db.query(models.Event).filter(models.Event.photographer_id == current_user.id).all()
        if events:
            event_ids = [e.id for e in events]
            event_names = [e.name for e in events]
            logs = db.query(models.SearchLog).filter(
                or_(
                    models.SearchLog.event_id.in_(event_ids),
                    and_(models.SearchLog.event_id == None, models.SearchLog.event.in_(event_names))
                )
            ).order_by(models.SearchLog.created_at.desc()).limit(limit).all()
        else:
            logs = []
    elif photographer_email and is_super_admin(current_user):
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if photographer:
            events = db.query(models.Event).filter(models.Event.photographer_id == photographer.id).all()
            if events:
                event_ids = [e.id for e in events]
                event_names = [e.name for e in events]
                logs = db.query(models.SearchLog).filter(
                    or_(
                        models.SearchLog.event_id.in_(event_ids),
                        and_(models.SearchLog.event_id == None, models.SearchLog.event.in_(event_names))
                    )
                ).order_by(models.SearchLog.created_at.desc()).limit(limit).all()
            else:
                logs = []
        else:
            logs = []
    else:
        logs = db.query(models.SearchLog).order_by(models.SearchLog.created_at.desc()).limit(limit).all()
        
    return [
        {
            "id": l.id,
            "guest": l.guest,
            "mobile": l.mobile or "",
            "event": l.event,
            "time": l.time,
            "photos": l.photos,
            "status": l.status,
            "selfie_url": l.selfie_url or ""
        } for l in logs
    ]

@router.post("/selfie", response_model=SearchResponse)
async def search_by_selfie(
    event_id: str = Form(...),
    guest_name: str = Form(...),
    guest_mobile: str = Form(""),
    live_capture: str = Form(""),
    verification_token: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if live_capture != "1":
        raise HTTPException(
            status_code=403,
            detail="Live camera selfie is required. Uploaded gallery photos are not allowed for guest search.",
        )

    if event_id in {"", "All", "all"}:
        raise HTTPException(status_code=400, detail="A valid event link is required")
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found. Please select a valid event.")
    if event.status == "Archived":
        raise HTTPException(status_code=403, detail="This event has been archived. Selfie search is closed.")

    clean_mobile = "".join(ch for ch in guest_mobile if ch.isdigit())
    if not clean_mobile or not consume_verified_token(verification_token, event.id, clean_mobile):
        raise HTTPException(status_code=403, detail="Verified guest OTP is required before selfie search")

    contents = await file.read()
    
    # 1. Upload selfie to storage (for logging/debugging)
    import os
    file_ext = os.path.splitext(file.filename)[1] if hasattr(file, 'filename') and file.filename else '.jpg'
    if not file_ext:
        file_ext = ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    storage_key = f"searches/{unique_filename}"
    selfie_url = storage_manager.upload_file(contents, storage_key, is_path=False)

    guest_record = None
    if clean_mobile:
        guest_record = db.query(models.GuestAccess).filter(
            models.GuestAccess.event_id == event_id,
            models.GuestAccess.mobile == clean_mobile,
        ).first()
        if guest_record:
            guest_record.name = guest_name
            guest_record.last_verified_at = datetime.utcnow()
        else:
            guest_record = models.GuestAccess(
                event_id=event_id,
                name=guest_name,
                mobile=clean_mobile,
                search_count=0,
            )
            db.add(guest_record)

    # 2. Extract embedding from guest's selfie
    detected_faces = ai_engine.process_image(contents)
    if not detected_faces:
        duplicate_window = datetime.utcnow() - timedelta(minutes=5)
        failed_log = None
        if clean_mobile:
            failed_log = db.query(models.SearchLog).filter(
                models.SearchLog.event_id == event.id,
                models.SearchLog.mobile == clean_mobile,
                models.SearchLog.created_at >= duplicate_window,
            ).order_by(models.SearchLog.created_at.desc()).first()

        if failed_log:
            failed_log.guest = guest_name
            failed_log.photos = 0
            failed_log.status = "Failed"
            failed_log.selfie_url = selfie_url
            failed_log.time = datetime.now().strftime("%d %b, %I:%M %p")
            failed_log.created_at = datetime.utcnow()
        else:
            failed_log = models.SearchLog(
                id=f"SL-{uuid.uuid4().hex[:6].upper()}",
                guest=guest_name,
                mobile=clean_mobile or guest_mobile,
                event=event.name,
                event_id=event.id,
                photos=0,
                status="Failed",
                selfie_url=selfie_url,
                created_at=datetime.utcnow(),
            )
            db.add(failed_log)

        if guest_record:
            guest_record.search_count = (guest_record.search_count or 0) + 1
        db.commit()
        
        return SearchResponse(
            search_log_id=failed_log.id,
            guest=guest_name,
            event=event.name,
            status="Failed",
            matches=[]
        )

    guest_embeddings = [
        face["embedding"]
        for face in detected_faces[:AI_GUEST_FACE_CANDIDATES]
        if face.get("embedding")
    ]
    
    # 3. Retrieve all faces registered for this event
    # If pgvector is present, we can do direct query, otherwise we compare in Python
    from sqlalchemy import and_
    db_faces = db.query(models.Face).join(models.Photo).filter(
        and_(models.Photo.event_id == event_id, models.Photo.status == "Completed")
    ).all()

    matches = _build_adaptive_matches(guest_embeddings, db_faces)

    # 4. Log the search in DB
    duplicate_window = datetime.utcnow() - timedelta(minutes=5)
    search_log = None
    if clean_mobile:
        search_log = db.query(models.SearchLog).filter(
            models.SearchLog.event_id == event.id,
            models.SearchLog.mobile == clean_mobile,
            models.SearchLog.created_at >= duplicate_window,
        ).order_by(models.SearchLog.created_at.desc()).first()

    if search_log:
        search_log.guest = guest_name
        search_log.photos = len(matches)
        search_log.status = "Completed"
        search_log.selfie_url = selfie_url
        search_log.time = datetime.now().strftime("%d %b, %I:%M %p")
        search_log.created_at = datetime.utcnow()
    else:
        search_log = models.SearchLog(
            id=f"SL-{uuid.uuid4().hex[:6].upper()}",
            guest=guest_name,
            mobile=clean_mobile or guest_mobile,
            event=event.name,
            event_id=event.id,
            photos=len(matches),
            status="Completed",
            selfie_url=selfie_url,
            created_at=datetime.utcnow(),
        )
        db.add(search_log)

    if guest_record:
        guest_record.search_count = (guest_record.search_count or 0) + 1
    db.commit()
    db.refresh(search_log)

    return SearchResponse(
        search_log_id=search_log.id,
        guest=guest_name,
        event=event.name,
        status="Completed",
        matches=[MatchResponse(**m) for m in matches]
    )
