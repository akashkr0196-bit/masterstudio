from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..auth import CurrentUser, get_current_user, is_super_admin
from ..database import get_db

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[str] = ""
    actor_email: Optional[str] = ""
    actor_role: Optional[str] = ""
    action: str
    resource_type: Optional[str] = ""
    resource_id: Optional[str] = ""
    result: str
    ip_address: Optional[str] = ""
    user_agent: Optional[str] = ""
    details: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    actor_email: Optional[str] = None,
    resource_type: Optional[str] = None,
    result: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can view audit logs")

    query = db.query(models.AuditLog)
    if action:
        query = query.filter(models.AuditLog.action == action)
    if actor_email:
        query = query.filter(models.AuditLog.actor_email.ilike(f"%{actor_email}%"))
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)
    if result:
        query = query.filter(models.AuditLog.result == result)

    return query.order_by(models.AuditLog.created_at.desc()).limit(max(1, min(limit, 1000))).all()
