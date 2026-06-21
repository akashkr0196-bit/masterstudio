import json
import logging
import os
from datetime import date
from typing import Optional
from urllib import parse, request
from urllib.error import HTTPError, URLError

from sqlalchemy.orm import Session

from .models import SystemSetting

logger = logging.getLogger(__name__)


class SmsDeliveryError(Exception):
    pass


def _digits(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def _get_setting(db: Session, key: str, default: str = "") -> str:
    setting: Optional[SystemSetting] = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return setting.value if setting and setting.value is not None else default


def _setting_bool(db: Session, key: str, default: bool = False) -> bool:
    value = _get_setting(db, key, str(default))
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _setting_int(db: Session, key: str, default: int) -> int:
    try:
        return int(_get_setting(db, key, str(default)))
    except ValueError:
        return default


def _increment_daily_count(db: Session, key: str) -> None:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = str(int(setting.value or "0") + 1)
    else:
        db.add(SystemSetting(key=key, value="1"))
    db.commit()


def _ensure_daily_limit(db: Session) -> str:
    today_key = f"sms_sent_count_{date.today().isoformat()}"
    daily_limit = max(1, _setting_int(db, "whatsapp_daily_limit", int(os.getenv("SMS_DAILY_LIMIT", "50"))))
    sent_count = _setting_int(db, today_key, 0)
    if sent_count >= daily_limit:
        raise SmsDeliveryError("Daily SMS limit reached. Increase limit from Super Admin settings.")
    return today_key


def send_fast2sms_otp(db: Session, mobile: str, otp: str) -> None:
    clean_mobile = _digits(mobile)
    if len(clean_mobile) < 10:
        raise SmsDeliveryError("Valid mobile number is required for OTP SMS.")

    api_key = _get_setting(db, "whatsapp_api_token", os.getenv("FAST2SMS_API_KEY", "")).strip()
    if not api_key:
        raise SmsDeliveryError("Fast2SMS API key is missing.")

    daily_count_key = _ensure_daily_limit(db)
    target_mobile = clean_mobile[-10:]
    payload = parse.urlencode({
        "route": "otp",
        "variables_values": otp,
        "numbers": target_mobile,
    }).encode("utf-8")
    req = request.Request(
        "https://www.fast2sms.com/dev/bulkV2",
        data=payload,
        headers={
            "authorization": api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=12) as response:
            body = response.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace") if exc.fp else str(exc)
        logger.warning("Fast2SMS HTTP error: %s", detail)
        raise SmsDeliveryError("Fast2SMS rejected the OTP request.")
    except URLError as exc:
        logger.warning("Fast2SMS network error: %s", exc)
        raise SmsDeliveryError("Fast2SMS network request failed.")

    try:
        result = json.loads(body)
    except json.JSONDecodeError:
        logger.warning("Fast2SMS returned non-JSON response: %s", body[:300])
        raise SmsDeliveryError("Fast2SMS returned an invalid response.")

    if result.get("return") is not True:
        logger.warning("Fast2SMS send failed: %s", result)
        raise SmsDeliveryError(str(result.get("message") or "Fast2SMS could not send OTP."))

    _increment_daily_count(db, daily_count_key)


def send_guest_otp_if_enabled(db: Session, mobile: str, otp: str) -> bool:
    method = _get_setting(db, "whatsapp_method", "Manual").strip().lower()
    provider = _get_setting(db, "whatsapp_provider", os.getenv("SMS_PROVIDER", "Fast2SMS")).strip().lower()
    enabled = _setting_bool(db, "whatsapp_enabled", False)
    notify_guest_otp = _setting_bool(db, "whatsapp_notify_guest_otp", False)

    if not enabled or method != "automated" or not notify_guest_otp:
        return False
    if provider != "fast2sms":
        raise SmsDeliveryError(f"Guest OTP provider '{provider}' is not implemented yet.")

    send_fast2sms_otp(db, mobile, otp)
    return True
