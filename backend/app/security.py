import base64
import hashlib
import hmac
import os
import time
from collections import defaultdict
from dataclasses import dataclass

PASSWORD_PREFIX = "pbkdf2_sha256"
PASSWORD_ITERATIONS = int(os.getenv("PASSWORD_ITERATIONS", "260000"))
LOGIN_WINDOW_SECONDS = int(os.getenv("LOGIN_WINDOW_SECONDS", "600"))
LOGIN_MAX_FAILURES = int(os.getenv("LOGIN_MAX_FAILURES", "5"))
LOGIN_LOCK_SECONDS = int(os.getenv("LOGIN_LOCK_SECONDS", "900"))


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def is_password_hash(value: str) -> bool:
    return bool(value and value.startswith(f"{PASSWORD_PREFIX}$"))


def hash_password(password: str) -> str:
    if not password:
        return ""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"{PASSWORD_PREFIX}${PASSWORD_ITERATIONS}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored_value: str) -> bool:
    if not stored_value:
        return False
    if not is_password_hash(stored_value):
        return hmac.compare_digest(password or "", stored_value)
    try:
        _, iterations, salt_b64, digest_b64 = stored_value.split("$", 3)
        expected = _unb64(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", (password or "").encode("utf-8"), _unb64(salt_b64), int(iterations))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


@dataclass
class LoginBucket:
    failures: list[float]
    locked_until: float = 0


_login_buckets: dict[str, LoginBucket] = defaultdict(lambda: LoginBucket(failures=[]))


def login_rate_limit_key(ip_address: str, email: str) -> str:
    return f"{ip_address or 'unknown'}:{(email or '').strip().lower()}"


def get_login_lock_seconds(key: str) -> int:
    bucket = _login_buckets[key]
    now = time.time()
    if bucket.locked_until > now:
        return int(bucket.locked_until - now)
    return 0


def record_login_failure(key: str) -> int:
    bucket = _login_buckets[key]
    now = time.time()
    bucket.failures = [item for item in bucket.failures if now - item <= LOGIN_WINDOW_SECONDS]
    bucket.failures.append(now)
    if len(bucket.failures) >= LOGIN_MAX_FAILURES:
        bucket.locked_until = now + LOGIN_LOCK_SECONDS
        bucket.failures.clear()
        return LOGIN_LOCK_SECONDS
    return 0


def record_login_success(key: str) -> None:
    _login_buckets.pop(key, None)
