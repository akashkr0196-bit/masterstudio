import os

from sqlalchemy import inspect, text

from .database import APP_ENV, Base, HAS_PGVECTOR, IS_POSTGRES, IS_SQLITE, engine


INDEXES = [
    ("ix_events_photographer_id", "events", "photographer_id"),
    ("ix_events_created_at", "events", "created_at"),
    ("ix_photos_event_id", "photos", "event_id"),
    ("ix_photos_created_at", "photos", "created_at"),
    ("ix_faces_photo_id", "faces", "photo_id"),
    ("ix_search_logs_event_id", "search_logs", "event_id"),
    ("ix_search_logs_mobile", "search_logs", "mobile"),
    ("ix_search_logs_created_at", "search_logs", "created_at"),
    ("ix_guest_access_event_id", "guest_access", "event_id"),
    ("ix_photo_selections_event_id", "photo_selections", "event_id"),
    ("ix_photo_selections_photo_id", "photo_selections", "photo_id"),
    ("ix_downloads_event", "downloads", "event"),
    ("ix_payments_event", "payments", "event"),
]


def _should_auto_create_tables() -> bool:
    configured = os.getenv("AUTO_CREATE_TABLES", "").strip().lower()
    if configured:
        return configured in {"1", "true", "yes", "on"}
    return APP_ENV not in {"production", "prod"}


def _create_pg_extensions() -> None:
    if not IS_POSTGRES:
        return
    with engine.begin() as conn:
        if HAS_PGVECTOR:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))


def _ensure_indexes() -> None:
    with engine.begin() as conn:
        for index_name, table_name, column_name in INDEXES:
            conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({column_name})"))


def _ensure_sqlite_legacy_columns() -> None:
    if not IS_SQLITE:
        return
    with engine.begin() as conn:
        user_columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()]
        if "avatar_url" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN avatar_url VARCHAR DEFAULT ''")
        if "brand_logo_url" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN brand_logo_url VARCHAR DEFAULT ''")
        if "active_session_id" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN active_session_id VARCHAR DEFAULT ''")
        for column_name in ["brand_name", "brand_rights_text", "instagram_url", "facebook_url", "website_url", "whatsapp_url", "address"]:
            if column_name not in user_columns:
                conn.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {column_name} VARCHAR DEFAULT ''")
        if "about_studio" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN about_studio TEXT DEFAULT ''")
        if "verification_status" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN verification_status VARCHAR DEFAULT 'Pending Verification'")
        if "brand_change_request" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN brand_change_request TEXT DEFAULT ''")
        if "password" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN password VARCHAR DEFAULT ''")
        if "temp_password" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN temp_password VARCHAR DEFAULT ''")
        if "must_change_password" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0")
        if "first_login_done" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN first_login_done BOOLEAN DEFAULT 0")
        if "storage_quota_gb" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN storage_quota_gb INTEGER DEFAULT 50")

        search_log_columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(search_logs)").fetchall()]
        if "mobile" not in search_log_columns:
            conn.exec_driver_sql("ALTER TABLE search_logs ADD COLUMN mobile VARCHAR DEFAULT ''")
        if "selfie_url" not in search_log_columns:
            conn.exec_driver_sql("ALTER TABLE search_logs ADD COLUMN selfie_url VARCHAR DEFAULT ''")
        if "created_at" not in search_log_columns:
            conn.exec_driver_sql("ALTER TABLE search_logs ADD COLUMN created_at DATETIME")
        if "event_id" not in search_log_columns:
            conn.exec_driver_sql("ALTER TABLE search_logs ADD COLUMN event_id VARCHAR")

        event_columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(events)").fetchall()]
        if "created_at" not in event_columns:
            conn.exec_driver_sql("ALTER TABLE events ADD COLUMN created_at DATETIME")
            conn.exec_driver_sql("UPDATE events SET created_at = datetime('now') WHERE created_at IS NULL")
        if "client_name" not in event_columns:
            conn.exec_driver_sql("ALTER TABLE events ADD COLUMN client_name VARCHAR DEFAULT ''")
        if "client_mobile" not in event_columns:
            conn.exec_driver_sql("ALTER TABLE events ADD COLUMN client_mobile VARCHAR DEFAULT ''")

        photo_columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(photos)").fetchall()]
        if "preview_name" not in photo_columns:
            conn.exec_driver_sql("ALTER TABLE photos ADD COLUMN preview_name VARCHAR DEFAULT ''")
        if "size_bytes" not in photo_columns:
            conn.exec_driver_sql("ALTER TABLE photos ADD COLUMN size_bytes INTEGER DEFAULT 0")
        if "created_at" not in photo_columns:
            conn.exec_driver_sql("ALTER TABLE photos ADD COLUMN created_at DATETIME")
            conn.exec_driver_sql("UPDATE photos SET created_at = datetime('now') WHERE created_at IS NULL")

        audit_tables = [row[0] for row in conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        if "audit_logs" in audit_tables:
            audit_columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(audit_logs)").fetchall()]
            for column_name, definition in {
                "actor_id": "VARCHAR DEFAULT ''",
                "actor_email": "VARCHAR DEFAULT ''",
                "actor_role": "VARCHAR DEFAULT ''",
                "resource_type": "VARCHAR DEFAULT ''",
                "resource_id": "VARCHAR DEFAULT ''",
                "ip_address": "VARCHAR DEFAULT ''",
                "user_agent": "VARCHAR DEFAULT ''",
                "details": "TEXT DEFAULT ''",
            }.items():
                if column_name not in audit_columns:
                    conn.exec_driver_sql(f"ALTER TABLE audit_logs ADD COLUMN {column_name} {definition}")


def initialize_database() -> None:
    _create_pg_extensions()
    if _should_auto_create_tables():
        Base.metadata.create_all(bind=engine)
        inspector = inspect(engine)
        if inspector.has_table("users"):
            _ensure_sqlite_legacy_columns()
        _ensure_indexes()
