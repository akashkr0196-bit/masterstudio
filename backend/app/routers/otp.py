import hashlib
import hmac
import logging
import os
import secrets
import time
from dataclasses import dataclass
from typing import Dict, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..sms_gateway import SmsDeliveryError, send_guest_otp_if_enabled

router = APIRouter(prefix="/otp", tags=["otp"])
logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))


@dataclass
class OtpRecord:
    otp_hash: str
    expires_at: float
    attempts: int = 0


_otp_store: Dict[Tuple[str, str, str], OtpRecord] = {}
_verified_store: Dict[str, Tuple[str, str, str, float]] = {}


class OtpSendRequest(BaseModel):
    event_id: str
    name: str
    mobile: str


class OtpVerifyRequest(BaseModel):
    event_id: str
    mobile: str
    otp: str


def _debug_otp_enabled() -> bool:
    if os.getenv("APP_ENV", "development").strip().lower() in {"production", "prod"}:
        return False
    return os.getenv("OTP_DEBUG_LOGGING", "").strip().lower() in {"1", "true", "yes", "on"}


def _digits(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def _hash_otp(otp: str) -> str:
    secret = os.getenv("JWT_SECRET", "local-otp-secret")
    return hmac.new(secret.encode("utf-8"), otp.encode("utf-8"), hashlib.sha256).hexdigest()


def consume_verified_token(token: str, event_id: str, mobile: str) -> bool:
    payload = _verified_store.get(token)
    if not payload:
        return False
    stored_event_id, stored_mobile, _name, expires_at = payload
    if expires_at < time.time():
        _verified_store.pop(token, None)
        return False
    return stored_event_id == event_id and stored_mobile == _digits(mobile)


@router.post("/send")
def send_otp(payload: OtpSendRequest, db: Session = Depends(get_db)):
    clean_mobile = _digits(payload.mobile)
    if not payload.event_id or not payload.name.strip() or len(clean_mobile) < 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid event, name, and mobile are required")

    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    key = (payload.event_id, clean_mobile, payload.name.strip().lower())

    if _debug_otp_enabled():
        _otp_store[key] = OtpRecord(otp_hash=_hash_otp(otp), expires_at=time.time() + OTP_TTL_SECONDS)
        logger.info("OTP generated for event=%s mobile=%s: %s", payload.event_id, clean_mobile, otp)
        return {"sent": True, "expires_in": OTP_TTL_SECONDS, "debug_otp": otp}

    try:
        delivered = send_guest_otp_if_enabled(db, clean_mobile, otp)
    except SmsDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if not delivered:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Guest OTP SMS is not enabled. Enable Automated Fast2SMS guest OTP from Super Admin settings.",
        )

    _otp_store[key] = OtpRecord(otp_hash=_hash_otp(otp), expires_at=time.time() + OTP_TTL_SECONDS)
    return {"sent": True, "expires_in": OTP_TTL_SECONDS}


@router.post("/verify")
def verify_otp(payload: OtpVerifyRequest):
    clean_mobile = _digits(payload.mobile)
    clean_otp = _digits(payload.otp)
    if len(clean_otp) != 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="6 digit OTP is required")

    candidates = [key for key in _otp_store if key[0] == payload.event_id and key[1] == clean_mobile]
    if not candidates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired or not requested")

    key = candidates[-1]
    record = _otp_store[key]
    if record.expires_at < time.time():
        _otp_store.pop(key, None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")
    if record.attempts >= OTP_MAX_ATTEMPTS:
        _otp_store.pop(key, None)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many OTP attempts")
    record.attempts += 1
    if not hmac.compare_digest(record.otp_hash, _hash_otp(clean_otp)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    _otp_store.pop(key, None)
    token = secrets.token_urlsafe(32)
    _verified_store[token] = (payload.event_id, clean_mobile, key[2], time.time() + OTP_TTL_SECONDS)
    return {"verified": True, "verification_token": token}
