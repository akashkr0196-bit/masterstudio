from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..auth import CurrentUser, get_current_user, is_super_admin
from ..database import get_db

router = APIRouter(prefix="/validation", tags=["validation"])


class PhotographerValidationRow(BaseModel):
    id: str
    name: str
    email: str
    status: str
    verification_status: str
    plan: str
    profile_done: bool
    event_created: bool
    photos_uploaded: bool
    qr_shared: bool
    guests_used: bool
    client_selection_used: bool
    event_count: int
    photo_count: int
    guest_count: int
    search_count: int
    download_count: int
    selection_count: int


class ValidationSummaryResponse(BaseModel):
    target_photographers: int
    target_guests: int
    target_real_events: int
    photographers_registered: int
    active_photographers: int
    active_events: int
    real_events: int
    photos_uploaded: int
    guest_accesses: int
    guest_searches: int
    downloads: int
    client_selections: int
    feedback_messages: int
    payment_interest: int
    photographers: List[PhotographerValidationRow]


def _int_photos(value: str) -> int:
    try:
        return int(str(value or "0").replace(",", ""))
    except Exception:
        return 0


@router.get("/summary", response_model=ValidationSummaryResponse)
def get_validation_summary(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can view validation metrics")

    photographers = db.query(models.User).filter(func.lower(models.User.role) == "photographer").all()
    events = db.query(models.Event).all()
    photos = db.query(models.Photo).all()
    guest_accesses = db.query(models.GuestAccess).all()
    search_logs = db.query(models.SearchLog).all()
    downloads = db.query(models.Download).all()
    selections = db.query(models.PhotoSelection).all()
    feedback_messages = db.query(models.ContactMessage).count()

    event_by_id = {event.id: event for event in events}
    event_names_by_photographer = {}
    events_by_photographer = {}
    for event in events:
        events_by_photographer.setdefault(event.photographer_id or "", []).append(event)
        event_names_by_photographer.setdefault(event.photographer_id or "", set()).add(event.name)

    rows: List[PhotographerValidationRow] = []
    payment_interest = 0
    for photographer in photographers:
        photographer_events = events_by_photographer.get(photographer.id, [])
        event_ids = {event.id for event in photographer_events}
        event_names = event_names_by_photographer.get(photographer.id, set())
        photo_count = sum(1 for photo in photos if photo.event_id in event_ids)
        guest_count = sum(1 for guest in guest_accesses if guest.event_id in event_ids)
        search_count = sum(
            1
            for log in search_logs
            if (log.event_id and log.event_id in event_ids) or ((not log.event_id) and log.event in event_names)
        )
        download_count = sum(1 for download in downloads if download.event in event_names)
        selection_count = sum(1 for selection in selections if selection.event_id in event_ids)
        profile_done = bool((photographer.brand_name or "").strip() and (photographer.phone or "").strip())
        event_created = len(photographer_events) > 0
        photos_uploaded = photo_count > 0
        qr_shared = search_count > 0 or guest_count > 0
        guests_used = guest_count > 0 or search_count > 0 or download_count > 0
        client_selection_used = selection_count > 0
        plan = photographer.plan or ""
        if plan.lower() not in {"", "trial", "free", "pilot"}:
            payment_interest += 1

        rows.append(PhotographerValidationRow(
            id=photographer.id,
            name=photographer.name,
            email=photographer.email,
            status=photographer.status or "",
            verification_status=photographer.verification_status or "",
            plan=plan,
            profile_done=profile_done,
            event_created=event_created,
            photos_uploaded=photos_uploaded,
            qr_shared=qr_shared,
            guests_used=guests_used,
            client_selection_used=client_selection_used,
            event_count=len(photographer_events),
            photo_count=photo_count,
            guest_count=guest_count,
            search_count=search_count,
            download_count=download_count,
            selection_count=selection_count,
        ))

    real_events = sum(1 for event in events if _int_photos(event.photos) > 0 or any(photo.event_id == event.id for photo in photos))

    return ValidationSummaryResponse(
        target_photographers=5,
        target_guests=50,
        target_real_events=1,
        photographers_registered=len(photographers),
        active_photographers=sum(1 for photographer in photographers if (photographer.status or "").lower() != "suspended"),
        active_events=sum(1 for event in events if event.status == "Active"),
        real_events=real_events,
        photos_uploaded=len(photos),
        guest_accesses=len(guest_accesses),
        guest_searches=len(search_logs),
        downloads=len(downloads),
        client_selections=len(selections),
        feedback_messages=feedback_messages,
        payment_interest=payment_interest,
        photographers=rows,
    )
