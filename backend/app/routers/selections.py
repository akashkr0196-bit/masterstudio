from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import PhotoSelection, Photo, Event, User
from ..auth import CurrentUser, get_current_user, get_optional_current_user, is_super_admin
from .otp import consume_verified_token

router = APIRouter(
    prefix="/selections",
    tags=["selections"],
)

class SelectionFavoriteToggle(BaseModel):
    event_id: str
    photo_id: int
    guest_mobile: str
    guest_name: Optional[str] = ""
    verification_token: str

class SelectionStatusUpdate(BaseModel):
    status: str  # "Selected", "Approved", "Rejected"

class SelectionResponse(BaseModel):
    id: int
    event_id: str
    photo_id: int
    guest_mobile: str
    guest_name: Optional[str] = ""
    status: str
    created_at: str

    class Config:
        from_attributes = True

class SelectionPhotoDetail(BaseModel):
    id: int
    photo_id: int
    photo_name: str
    preview_url: Optional[str] = ""
    guest_mobile: str
    guest_name: Optional[str] = ""
    status: str
    created_at: str

def _digits(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())

def _norm(value: str) -> str:
    return " ".join((value or "").strip().lower().split())

def _assert_event_owner(event: Event, current_user: Optional[CurrentUser]) -> None:
    if not current_user or is_super_admin(current_user):
        return
    if event.photographer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this event")

def _assert_verified_guest(event_id: str, mobile: str, verification_token: str) -> None:
    if not verification_token or not consume_verified_token(verification_token, event_id, mobile):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verified client OTP session is required")

@router.post("/favorite", response_model=Optional[SelectionResponse])
def toggle_favorite(data: SelectionFavoriteToggle, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    registered_mobile = _digits(event.client_mobile or "")
    registered_name = _norm(event.client_name or "")
    incoming_mobile = _digits(data.guest_mobile)
    incoming_name = _norm(data.guest_name or "")
    _assert_verified_guest(data.event_id, incoming_mobile, data.verification_token)
    if registered_mobile and registered_mobile != incoming_mobile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client mobile does not match this event"
        )
    if registered_name and registered_name != incoming_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client name does not match this event"
        )

    # Check if photo exists
    photo = db.query(Photo).filter(Photo.id == data.photo_id).first()
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    if photo.event_id != data.event_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Photo does not belong to this event"
        )
    
    # Check if already favorited by this guest
    existing = db.query(PhotoSelection).filter(
        PhotoSelection.photo_id == data.photo_id,
        PhotoSelection.guest_mobile == data.guest_mobile
    ).first()

    try:
        if existing:
            # Delete if exists (Toggle behavior)
            db.delete(existing)
            db.commit()
            return None
        else:
            # Create new favorite selection
            new_selection = PhotoSelection(
                event_id=data.event_id,
                photo_id=data.photo_id,
                guest_mobile=data.guest_mobile,
                guest_name=data.guest_name,
                status="Selected",
                created_at=datetime.now().strftime("%d %b %Y, %I:%M %p")
            )
            db.add(new_selection)
            db.commit()
            db.refresh(new_selection)
            return new_selection
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle favorite: {str(e)}"
        )

@router.get("/event/{event_id}", response_model=List[SelectionPhotoDetail])
def get_event_selections(event_id: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    try:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        _assert_event_owner(event, current_user)
        # Fetch selections joined with photos
        selections = db.query(PhotoSelection).filter(PhotoSelection.event_id == event_id).order_by(PhotoSelection.id.desc()).all()
        
        details = []
        for s in selections:
            photo = db.query(Photo).filter(Photo.id == s.photo_id).first()
            photo_name = photo.name if photo else "deleted_photo.jpg"
            preview_url = ""
            if photo:
                if getattr(photo, "preview_name", ""):
                    preview_url = f"/static/uploads/photos/preview/{photo.event_id}/{photo.preview_name}"
                else:
                    preview_url = f"/static/uploads/photos/{photo.name}"
            details.append(SelectionPhotoDetail(
                id=s.id,
                photo_id=s.photo_id,
                photo_name=photo_name,
                preview_url=preview_url,
                guest_mobile=s.guest_mobile,
                guest_name=s.guest_name or "",
                status=s.status,
                created_at=s.created_at
            ))
        return details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch event selections: {str(e)}"
        )

@router.get("/guest/{mobile}/event/{event_id}", response_model=List[int])
def get_guest_selections(mobile: str, event_id: str, verification_token: str, db: Session = Depends(get_db)):
    try:
        _assert_verified_guest(event_id, _digits(mobile), verification_token)
        # Just return list of favorited photo IDs for the guest to highlight them on screen
        selections = db.query(PhotoSelection).filter(
            PhotoSelection.guest_mobile == mobile,
            PhotoSelection.event_id == event_id
        ).all()
        return [s.photo_id for s in selections]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch guest selections: {str(e)}"
        )

@router.post("/{selection_id}/status", response_model=SelectionResponse)
def update_selection_status(selection_id: int, update: SelectionStatusUpdate, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    selection = db.query(PhotoSelection).filter(PhotoSelection.id == selection_id).first()
    if not selection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selection not found"
        )
    event = db.query(Event).filter(Event.id == selection.event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selection event not found")
    _assert_event_owner(event, current_user)
    try:
        selection.status = update.status
        db.commit()
        db.refresh(selection)
        return selection
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update selection status: {str(e)}"
        )
