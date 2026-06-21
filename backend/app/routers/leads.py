from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import CurrentUser, get_current_user, is_super_admin
from ..database import get_db
from ..models import Event, GuestAccess, Payment, Photo, User

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadDetail(BaseModel):
    id: int
    event_id: str
    event_name: str
    name: str
    mobile: str
    search_count: int
    created_at: str


class LeadStats(BaseModel):
    total_leads: int
    total_scans: int
    active_events: int
    storage_used_gb: float


class PaymentTransaction(BaseModel):
    id: str
    amount: str
    status: str
    date: str
    plan: str


def _resolve_photographer(db: Session, email: str, current_user: CurrentUser) -> User | None:
    if is_super_admin(current_user):
        return db.query(User).filter(func.lower(User.email) == func.lower(email.strip())).first()
    return db.query(User).filter(User.id == current_user.id).first()


@router.get("/photographer/{email}", response_model=List[LeadDetail])
def get_photographer_leads(email: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    try:
        photographer = _resolve_photographer(db, email, current_user)
        if not photographer:
            return []
        events = db.query(Event).filter(Event.photographer_id == photographer.id).all()
        event_map = {event.id: event.name for event in events}
        event_ids = list(event_map.keys())
        if not event_ids:
            return []

        accesses = (
            db.query(GuestAccess)
            .filter(GuestAccess.event_id.in_(event_ids))
            .order_by(GuestAccess.id.desc())
            .all()
        )
        return [
            LeadDetail(
                id=access.id,
                event_id=access.event_id,
                event_name=event_map.get(access.event_id, "Unknown Event"),
                name=access.name,
                mobile=access.mobile,
                search_count=access.search_count,
                created_at=access.created_at.strftime("%d %b %Y, %I:%M %p") if isinstance(access.created_at, datetime) else str(access.created_at),
            )
            for access in accesses
        ]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch leads: {str(exc)}",
        )


@router.get("/stats/{email}", response_model=LeadStats)
def get_photographer_stats(email: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    try:
        photographer = _resolve_photographer(db, email, current_user)
        if not photographer:
            return LeadStats(total_leads=0, total_scans=0, active_events=0, storage_used_gb=0)
        events = db.query(Event).filter(Event.photographer_id == photographer.id).all()
        event_ids = [event.id for event in events]
        if not event_ids:
            return LeadStats(total_leads=0, total_scans=0, active_events=0, storage_used_gb=0)

        total_leads = db.query(GuestAccess.mobile).filter(GuestAccess.event_id.in_(event_ids)).distinct().count()
        scan_rows = db.query(GuestAccess).filter(GuestAccess.event_id.in_(event_ids)).all()
        total_scans = sum(row.search_count for row in scan_rows)
        total_storage_bytes = db.query(func.coalesce(func.sum(Photo.size_bytes), 0)).filter(Photo.event_id.in_(event_ids)).scalar() or 0

        return LeadStats(
            total_leads=total_leads,
            total_scans=total_scans,
            active_events=len([event for event in events if event.status == "Active"]),
            storage_used_gb=round(total_storage_bytes / (1024 ** 3), 2),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(exc)}",
        )


@router.get("/payments/history/{email}", response_model=List[PaymentTransaction])
def get_payment_history(email: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if not is_super_admin(current_user) and current_user.email.lower() != email.strip().lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own billing history")
    try:
        photographer = _resolve_photographer(db, email, current_user)
        if not photographer:
            return []
        event_ids = [event.id for event in db.query(Event).filter(Event.photographer_id == photographer.id).all()]
        if not event_ids:
            return []
        payments = (
            db.query(Payment)
            .filter(Payment.event.in_(event_ids))
            .order_by(Payment.id.desc())
            .limit(100)
            .all()
        )
        return [
            PaymentTransaction(
                id=payment.id,
                amount=payment.amount,
                status=payment.status,
                date=payment.date,
                plan=photographer.plan or "Launch Trial",
            )
            for payment in payments
        ]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch billing history: {str(exc)}",
        )
