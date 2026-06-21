from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timedelta
from ..database import get_db
from ..storage import storage_manager
from .. import models
from ..models import SystemSetting
from ..auth import CurrentUser, get_current_user, get_optional_current_user, is_super_admin
from ..audit import log_audit

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger(__name__)

class EventCreate(BaseModel):
    id: str # e.g. EV009
    name: str
    date: str
    status: Optional[str] = "Active"
    revenue: Optional[str] = "Rs 0"
    client_name: Optional[str] = ""
    client_mobile: Optional[str] = ""

class EventClientUpdate(BaseModel):
    client_name: str = ""
    client_mobile: str = ""

class EventUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    name: str
    date: str
    photos: str
    guests: int
    qr: bool
    status: str
    revenue: str
    client_name: Optional[str] = ""
    client_mobile: Optional[str] = ""
    photographer_email: Optional[str] = None
    photographer_name: Optional[str] = None
    photographer_logo_url: Optional[str] = None
    photographer_brand_name: Optional[str] = None
    photographer_rights_text: Optional[str] = None
    photographer_instagram_url: Optional[str] = None
    photographer_facebook_url: Optional[str] = None
    photographer_website_url: Optional[str] = None
    photographer_whatsapp_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PublicEventResponse(BaseModel):
    id: str
    name: str
    date: str
    status: str
    photographer_logo_url: Optional[str] = None
    photographer_brand_name: Optional[str] = None
    photographer_rights_text: Optional[str] = None

class EventQrPayloadResponse(BaseModel):
    event_id: str
    event_name: str
    event_date: str
    public_path: str
    photographer_name: Optional[str] = None
    photographer_email: Optional[str] = None
    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    brand_rights_text: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    website_url: Optional[str] = None
    whatsapp_url: Optional[str] = None

def auto_archive_and_cleanup_events(db: Session):
    try:
        # 1. Archive active events older than 45 days
        setting = db.query(SystemSetting).filter(SystemSetting.key == "storage_auto_archive_days").first()
        try:
            auto_archive_days = int(setting.value) if setting and setting.value else 45
        except ValueError:
            auto_archive_days = 45
        archive_threshold = datetime.utcnow() - timedelta(days=max(7, min(auto_archive_days, 365)))
        events_to_archive = db.query(models.Event).filter(
            models.Event.status == "Active",
            models.Event.created_at <= archive_threshold
        ).all()
        
        for event in events_to_archive:
            event.status = "Archived"
            logger.info("Auto-archived event id=%s name=%s", event.id, event.name)
        
        if events_to_archive:
            db.commit()
            
        # 2. Cleanup guest selfies from search logs of archived events
        archived_event_ids = [ev.id for ev in db.query(models.Event).filter(models.Event.status == "Archived").all()]
        if archived_event_ids:
            logs_with_selfies = db.query(models.SearchLog).filter(
                models.SearchLog.event_id.in_(archived_event_ids),
                models.SearchLog.selfie_url != None,
                models.SearchLog.selfie_url != ""
            ).all()
            
            cleaned_count = 0
            for log in logs_with_selfies:
                url = log.selfie_url
                if "searches/" in url:
                    file_name = url.split("searches/")[-1]
                    storage_key = f"searches/{file_name}"
                    try:
                        storage_manager.delete_file(storage_key)
                    except Exception:
                        logger.exception("Failed to delete archived selfie file %s", storage_key)
                log.selfie_url = ""
                cleaned_count += 1
                
            if cleaned_count > 0:
                db.commit()
                logger.info("Cleaned up %s guest selfie files for archived events.", cleaned_count)
    except Exception:
        logger.exception("Error during auto-archive and cleanup run.")

def _assert_event_owner(event: models.Event, current_user: Optional[CurrentUser]) -> None:
    if current_user and is_super_admin(current_user):
        return
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if event.photographer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this event")

@router.get("/{event_id}/qr-payload", response_model=EventQrPayloadResponse)
def get_event_qr_payload(event_id: str, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    _assert_event_owner(event, current_user)

    photographer = db.query(models.User).filter(models.User.id == event.photographer_id).first() if event.photographer_id else None
    if not photographer and not is_super_admin(current_user):
        raise HTTPException(status_code=404, detail="Photographer profile not found")

    log_audit(
        db,
        action="qr_payload_generated",
        current_user=current_user,
        resource_type="event",
        resource_id=event.id,
        request=request,
        details={"event_name": event.name},
    )

    return {
        "event_id": event.id,
        "event_name": event.name,
        "event_date": event.date,
        "public_path": f"/find?event={event.id}",
        "photographer_name": photographer.name if photographer else None,
        "photographer_email": photographer.email if photographer else None,
        "brand_name": photographer.brand_name if photographer else None,
        "brand_logo_url": photographer.brand_logo_url if photographer else None,
        "brand_rights_text": photographer.brand_rights_text if photographer else None,
        "instagram_url": photographer.instagram_url if photographer else None,
        "facebook_url": photographer.facebook_url if photographer else None,
        "website_url": photographer.website_url if photographer else None,
        "whatsapp_url": photographer.whatsapp_url if photographer else None,
    }

@router.get("/", response_model=List[EventResponse])
def get_events(photographer_email: Optional[str] = None, limit: int = 500, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    # Automatically check and run archive/cleanup operations
    auto_archive_and_cleanup_events(db)
    limit = max(1, min(limit, 1000))
    if current_user and not is_super_admin(current_user):
        events = db.query(models.Event).filter(models.Event.photographer_id == current_user.id).order_by(models.Event.created_at.desc()).limit(limit).all()
    elif photographer_email and is_super_admin(current_user):
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        events = db.query(models.Event).filter(models.Event.photographer_id == photographer.id).order_by(models.Event.created_at.desc()).limit(limit).all() if photographer else []
    else:
        events = db.query(models.Event).order_by(models.Event.created_at.desc()).limit(limit).all()

    res = []
    for e in events:
        p_email = None
        p_name = None
        p_logo = None
        p_brand_name = None
        p_rights = None
        p_instagram = None
        p_facebook = None
        p_website = None
        p_whatsapp = None
        if e.photographer_id:
            p = db.query(models.User).filter(models.User.id == e.photographer_id).first()
            if p:
                p_email = p.email
                p_name = p.name
                p_logo = p.brand_logo_url
                p_brand_name = p.brand_name
                p_rights = p.brand_rights_text
                p_instagram = p.instagram_url
                p_facebook = p.facebook_url
                p_website = p.website_url
                p_whatsapp = p.whatsapp_url
        res.append({
            "id": e.id,
            "name": e.name,
            "date": e.date,
            "photos": e.photos,
            "guests": e.guests,
            "qr": e.qr,
            "status": e.status,
            "revenue": e.revenue,
            "client_name": e.client_name or "",
            "client_mobile": e.client_mobile or "",
            "photographer_email": p_email,
            "photographer_name": p_name,
            "photographer_logo_url": p_logo,
            "photographer_brand_name": p_brand_name,
            "photographer_rights_text": p_rights,
            "photographer_instagram_url": p_instagram,
            "photographer_facebook_url": p_facebook,
            "photographer_website_url": p_website,
            "photographer_whatsapp_url": p_whatsapp,
            "created_at": e.created_at
        })
    return res

@router.get("/public", response_model=List[PublicEventResponse])
def get_public_events(event_id: Optional[str] = None, db: Session = Depends(get_db)):
    if not event_id:
        return []
    query = db.query(models.Event).filter(models.Event.status != "Archived")
    query = query.filter(models.Event.id == event_id)
    events = query.order_by(models.Event.created_at.desc()).limit(1).all()

    res = []
    for e in events:
        p = db.query(models.User).filter(models.User.id == e.photographer_id).first() if e.photographer_id else None
        res.append({
            "id": e.id,
            "name": e.name,
            "date": e.date,
            "status": e.status,
            "photographer_logo_url": p.brand_logo_url if p else None,
            "photographer_brand_name": p.brand_name if p else None,
            "photographer_rights_text": p.brand_rights_text if p else None,
        })
    return res

@router.post("/", response_model=EventResponse)
def create_event(event_data: EventCreate, request: Request, photographer_email: Optional[str] = None, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    db_event = db.query(models.Event).filter(models.Event.id == event_data.id).first()
    if db_event:
        raise HTTPException(status_code=400, detail="Event with this ID already exists")
    
    photographer_id = None
    p_email = None
    p_name = None
    p_logo = None
    p_brand_name = None
    p_rights = None
    p_instagram = None
    p_facebook = None
    p_website = None
    p_whatsapp = None
    if is_super_admin(current_user):
        if not photographer_email:
            raise HTTPException(status_code=400, detail="Photographer is required when super admin creates an event")
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if not photographer or photographer.role != "Photographer":
            raise HTTPException(status_code=404, detail="Photographer not found")
        photographer_id = photographer.id
        p_email = photographer.email
        p_name = photographer.name
        p_logo = photographer.brand_logo_url
        p_brand_name = photographer.brand_name
        p_rights = photographer.brand_rights_text
        p_instagram = photographer.instagram_url
        p_facebook = photographer.facebook_url
        p_website = photographer.website_url
        p_whatsapp = photographer.whatsapp_url
    else:
        photographer = db.query(models.User).filter(models.User.id == current_user.id).first()
        if not photographer:
            raise HTTPException(status_code=401, detail="Photographer not found")

        photographer_id = photographer.id
        p_email = photographer.email
        p_name = photographer.name
        p_logo = photographer.brand_logo_url
        p_brand_name = photographer.brand_name
        p_rights = photographer.brand_rights_text
        p_instagram = photographer.instagram_url
        p_facebook = photographer.facebook_url
        p_website = photographer.website_url
        p_whatsapp = photographer.whatsapp_url

    new_event = models.Event(
        id=event_data.id,
        name=event_data.name,
        date=event_data.date,
        photographer_id=photographer_id,
        photos="0",
        guests=0,
        qr=True,
        status=event_data.status,
        revenue=event_data.revenue,
        client_name=event_data.client_name or "",
        client_mobile="".join(ch for ch in (event_data.client_mobile or "") if ch.isdigit())
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    log_audit(
        db,
        action="event_created",
        current_user=current_user,
        resource_type="event",
        resource_id=new_event.id,
        request=request,
        details={
            "name": new_event.name,
            "date": new_event.date,
            "client_name": new_event.client_name or "",
            "photographer_id": photographer_id,
            "photographer_email": p_email,
        },
    )

    return {
        "id": new_event.id,
        "name": new_event.name,
        "date": new_event.date,
        "photos": new_event.photos,
        "guests": new_event.guests,
        "qr": new_event.qr,
        "status": new_event.status,
        "revenue": new_event.revenue,
        "client_name": new_event.client_name or "",
        "client_mobile": new_event.client_mobile or "",
        "photographer_email": p_email,
        "photographer_name": p_name,
        "photographer_logo_url": p_logo,
        "photographer_brand_name": p_brand_name,
        "photographer_rights_text": p_rights,
        "photographer_instagram_url": p_instagram,
        "photographer_facebook_url": p_facebook,
        "photographer_website_url": p_website,
        "photographer_whatsapp_url": p_whatsapp,
        "created_at": new_event.created_at
    }

@router.patch("/{event_id}", response_model=EventResponse)
def update_event(event_id: str, event_data: EventUpdate, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    _assert_event_owner(event, current_user)

    if event_data.name is not None:
        event.name = event_data.name.strip()
    if event_data.date is not None:
        event.date = event_data.date.strip()
    if event_data.status is not None:
        if event_data.status not in {"Active", "Completed", "Archived"}:
            raise HTTPException(status_code=400, detail="Invalid event status")
        event.status = event_data.status
    db.commit()
    db.refresh(event)
    log_audit(
        db,
        action="event_updated",
        current_user=current_user,
        resource_type="event",
        resource_id=event.id,
        request=request,
        details={"name": event.name, "date": event.date, "status": event.status},
    )

    photographer = db.query(models.User).filter(models.User.id == event.photographer_id).first() if event.photographer_id else None
    return {
        "id": event.id,
        "name": event.name,
        "date": event.date,
        "photos": event.photos,
        "guests": event.guests,
        "qr": event.qr,
        "status": event.status,
        "revenue": event.revenue,
        "client_name": event.client_name or "",
        "client_mobile": event.client_mobile or "",
        "photographer_email": photographer.email if photographer else None,
        "photographer_name": photographer.name if photographer else None,
        "photographer_logo_url": photographer.brand_logo_url if photographer else None,
        "photographer_brand_name": photographer.brand_name if photographer else None,
        "photographer_rights_text": photographer.brand_rights_text if photographer else None,
        "photographer_instagram_url": photographer.instagram_url if photographer else None,
        "photographer_facebook_url": photographer.facebook_url if photographer else None,
        "photographer_website_url": photographer.website_url if photographer else None,
        "photographer_whatsapp_url": photographer.whatsapp_url if photographer else None,
        "created_at": event.created_at,
    }

@router.patch("/{event_id}/client", response_model=EventResponse)
def update_event_client(event_id: str, client_data: EventClientUpdate, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    _assert_event_owner(event, current_user)

    event.client_name = (client_data.client_name or "").strip()
    event.client_mobile = "".join(ch for ch in (client_data.client_mobile or "") if ch.isdigit())
    db.commit()
    db.refresh(event)
    log_audit(
        db,
        action="event_client_updated",
        current_user=current_user,
        resource_type="event",
        resource_id=event.id,
        request=request,
        details={"client_name": event.client_name or "", "client_mobile_last4": (event.client_mobile or "")[-4:]},
    )

    photographer = db.query(models.User).filter(models.User.id == event.photographer_id).first() if event.photographer_id else None
    return {
        "id": event.id,
        "name": event.name,
        "date": event.date,
        "photos": event.photos,
        "guests": event.guests,
        "qr": event.qr,
        "status": event.status,
        "revenue": event.revenue,
        "client_name": event.client_name or "",
        "client_mobile": event.client_mobile or "",
        "photographer_email": photographer.email if photographer else None,
        "photographer_name": photographer.name if photographer else None,
        "photographer_logo_url": photographer.brand_logo_url if photographer else None,
        "photographer_brand_name": photographer.brand_name if photographer else None,
        "photographer_rights_text": photographer.brand_rights_text if photographer else None,
        "photographer_instagram_url": photographer.instagram_url if photographer else None,
        "photographer_facebook_url": photographer.facebook_url if photographer else None,
        "photographer_website_url": photographer.website_url if photographer else None,
        "photographer_whatsapp_url": photographer.whatsapp_url if photographer else None,
        "created_at": event.created_at,
    }

@router.delete("/{event_id}")
def delete_event(event_id: str, request: Request, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    _assert_event_owner(event, current_user)
    event_name = event.name
    db.delete(event)
    db.commit()
    log_audit(
        db,
        action="event_deleted",
        current_user=current_user,
        resource_type="event",
        resource_id=event_id,
        request=request,
        details={"name": event_name},
    )
    return {"message": f"Event {event_id} deleted successfully"}
