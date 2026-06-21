from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional

from ..database import get_db
from .. import models
from ..auth import CurrentUser, get_current_user, is_super_admin

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentResponse(BaseModel):
    id: str
    client: str
    event: str
    amount: str
    status: str
    date: str

    class Config:
        from_attributes = True


def parse_revenue(value: str) -> int:
    try:
        cleaned = "".join(ch for ch in (value or "") if ch.isdigit())
        if cleaned:
            return int(cleaned)
        return int(
            (value or "")
            .replace("Rs", "")
            .replace("₹", "")
            .replace(",", "")
            .strip()
        )
    except ValueError:
        return 0


@router.get("/transactions", response_model=List[PaymentResponse])
def get_transactions(photographer_email: Optional[str] = None, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if current_user and not is_super_admin(current_user):
        event_names = [e.name for e in db.query(models.Event).filter(models.Event.photographer_id == current_user.id).all()]
        return db.query(models.Payment).filter(models.Payment.event.in_(event_names)).all() if event_names else []
    if photographer_email and is_super_admin(current_user):
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if photographer:
            event_names = [
                e.name for e in db.query(models.Event).filter(models.Event.photographer_id == photographer.id).all()
            ]
            return db.query(models.Payment).filter(models.Payment.event.in_(event_names)).all()

    return db.query(models.Payment).all()


@router.get("/stats")
def get_dashboard_stats(photographer_email: Optional[str] = None, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    if current_user and not is_super_admin(current_user):
        photographer = db.query(models.User).filter(models.User.id == current_user.id).first()
        if photographer:
            events = db.query(models.Event).filter(models.Event.photographer_id == photographer.id).all()
            event_ids = [e.id for e in events]
            event_names = [e.name for e in events]
            return {
                "total_events": len(events),
                "active_events": sum(1 for e in events if e.status == "Active"),
                "total_photos": db.query(models.Photo).filter(models.Photo.event_id.in_(event_ids)).count() if event_ids else 0,
                "guests_searched": db.query(models.SearchLog).filter(models.SearchLog.event_id.in_(event_ids)).count() if event_ids else 0,
                "total_downloads": db.query(models.Download).filter(models.Download.event.in_(event_names)).count() if event_names else 0,
                "total_revenue": f"Rs {sum(parse_revenue(e.revenue) for e in events):,}",
            }
    if photographer_email and is_super_admin(current_user):
        photographer = db.query(models.User).filter(func.lower(models.User.email) == func.lower(photographer_email)).first()
        if photographer:
            events = db.query(models.Event).filter(models.Event.photographer_id == photographer.id).all()
            event_ids = [e.id for e in events]
            event_names = [e.name for e in events]

            return {
                "total_events": len(events),
                "active_events": sum(1 for e in events if e.status == "Active"),
                "total_photos": db.query(models.Photo).filter(models.Photo.event_id.in_(event_ids)).count() if event_ids else 0,
                "guests_searched": db.query(models.SearchLog).filter(models.SearchLog.event.in_(event_names)).count() if event_names else 0,
                "total_downloads": db.query(models.Download).filter(models.Download.event.in_(event_names)).count() if event_names else 0,
                "total_revenue": f"Rs {sum(parse_revenue(e.revenue) for e in events):,}",
            }

    events = db.query(models.Event).all()

    return {
        "total_events": len(events),
        "active_events": sum(1 for e in events if e.status == "Active"),
        "total_photos": db.query(models.Photo).count(),
        "guests_searched": db.query(models.SearchLog).count(),
        "total_downloads": db.query(models.Download).count(),
        "total_revenue": f"Rs {sum(parse_revenue(e.revenue) for e in events):,}",
    }
