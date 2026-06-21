import json
import logging
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from . import models
from .auth import CurrentUser

logger = logging.getLogger(__name__)


def _request_ip(request: Optional[Request]) -> str:
    if not request:
        return ""
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else ""


def _request_user_agent(request: Optional[Request]) -> str:
    if not request:
        return ""
    return request.headers.get("user-agent", "")[:500]


def log_audit(
    db: Session,
    *,
    action: str,
    current_user: Optional[CurrentUser] = None,
    actor_id: str = "",
    actor_email: str = "",
    actor_role: str = "",
    resource_type: str = "",
    resource_id: str = "",
    result: str = "success",
    request: Optional[Request] = None,
    details: Optional[dict[str, Any]] = None,
) -> None:
    try:
        audit = models.AuditLog(
            actor_id=current_user.id if current_user else actor_id,
            actor_email=current_user.email if current_user else actor_email,
            actor_role=current_user.role if current_user else actor_role,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id or ""),
            result=result,
            ip_address=_request_ip(request),
            user_agent=_request_user_agent(request),
            details=json.dumps(details or {}, separators=(",", ":"), ensure_ascii=False),
        )
        db.add(audit)
        db.commit()
    except Exception as err:
        db.rollback()
        logger.exception("Audit log write failed for action=%s", action)
