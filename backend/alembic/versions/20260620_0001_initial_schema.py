"""initial production schema

Revision ID: 20260620_0001
Revises:
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover - only used when pgvector is installed
    Vector = None

revision = "20260620_0001"
down_revision = None
branch_labels = None
depends_on = None


def _embedding_type():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql" and Vector is not None:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        return Vector(512)
    return sa.Text()


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=True, default="Guest"),
        sa.Column("phone", sa.String(), nullable=True, default=""),
        sa.Column("avatar_url", sa.String(), nullable=True, default=""),
        sa.Column("brand_logo_url", sa.String(), nullable=True, default=""),
        sa.Column("brand_name", sa.String(), nullable=True, default=""),
        sa.Column("brand_rights_text", sa.String(), nullable=True, default=""),
        sa.Column("instagram_url", sa.String(), nullable=True, default=""),
        sa.Column("facebook_url", sa.String(), nullable=True, default=""),
        sa.Column("website_url", sa.String(), nullable=True, default=""),
        sa.Column("whatsapp_url", sa.String(), nullable=True, default=""),
        sa.Column("address", sa.String(), nullable=True, default=""),
        sa.Column("about_studio", sa.Text(), nullable=True, default=""),
        sa.Column("verification_status", sa.String(), nullable=True, default="Pending Verification"),
        sa.Column("brand_change_request", sa.Text(), nullable=True, default=""),
        sa.Column("events_count", sa.Integer(), nullable=True, default=0),
        sa.Column("joined", sa.String(), nullable=True),
        sa.Column("plan", sa.String(), nullable=True, default="Premium"),
        sa.Column("status", sa.String(), nullable=True, default="Active"),
        sa.Column("storage_quota_gb", sa.Integer(), nullable=True, default=50),
        sa.Column("active_session_id", sa.String(), nullable=True, default=""),
        sa.Column("password", sa.String(), nullable=True, default=""),
        sa.Column("temp_password", sa.String(), nullable=True, default=""),
        sa.Column("must_change_password", sa.Boolean(), nullable=True, default=False),
        sa.Column("first_login_done", sa.Boolean(), nullable=True, default=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("date", sa.String(), nullable=False),
        sa.Column("photos", sa.String(), nullable=True, default="0"),
        sa.Column("guests", sa.Integer(), nullable=True, default=0),
        sa.Column("qr", sa.Boolean(), nullable=True, default=True),
        sa.Column("status", sa.String(), nullable=True, default="Active"),
        sa.Column("revenue", sa.String(), nullable=True, default="Rs 0"),
        sa.Column("client_name", sa.String(), nullable=True, default=""),
        sa.Column("client_mobile", sa.String(), nullable=True, default=""),
        sa.Column("photographer_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_events_id", "events", ["id"])
    op.create_index("ix_events_photographer_id", "events", ["photographer_id"])
    op.create_index("ix_events_created_at", "events", ["created_at"])

    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.String(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("preview_name", sa.String(), nullable=True, default=""),
        sa.Column("size", sa.String(), nullable=True, default="0 MB"),
        sa.Column("size_bytes", sa.Integer(), nullable=True, default=0),
        sa.Column("progress", sa.Integer(), nullable=True, default=100),
        sa.Column("status", sa.String(), nullable=True, default="Completed"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_photos_id", "photos", ["id"])
    op.create_index("ix_photos_event_id", "photos", ["event_id"])
    op.create_index("ix_photos_created_at", "photos", ["created_at"])

    op.create_table(
        "faces",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("photo_id", sa.Integer(), sa.ForeignKey("photos.id"), nullable=False),
        sa.Column("bbox_x1", sa.Float(), nullable=False),
        sa.Column("bbox_y1", sa.Float(), nullable=False),
        sa.Column("bbox_x2", sa.Float(), nullable=False),
        sa.Column("bbox_y2", sa.Float(), nullable=False),
        sa.Column("embedding", _embedding_type(), nullable=True),
    )
    op.create_index("ix_faces_id", "faces", ["id"])
    op.create_index("ix_faces_photo_id", "faces", ["photo_id"])

    op.create_table(
        "search_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("guest", sa.String(), nullable=False),
        sa.Column("mobile", sa.String(), nullable=True, default=""),
        sa.Column("event", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(), sa.ForeignKey("events.id"), nullable=True),
        sa.Column("time", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("photos", sa.Integer(), nullable=True, default=0),
        sa.Column("status", sa.String(), nullable=True, default="Completed"),
        sa.Column("selfie_url", sa.String(), nullable=True, default=""),
    )
    op.create_index("ix_search_logs_id", "search_logs", ["id"])
    op.create_index("ix_search_logs_mobile", "search_logs", ["mobile"])
    op.create_index("ix_search_logs_event_id", "search_logs", ["event_id"])
    op.create_index("ix_search_logs_created_at", "search_logs", ["created_at"])

    op.create_table(
        "guest_access",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.String(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("mobile", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(), nullable=True),
        sa.Column("search_count", sa.Integer(), nullable=True, default=0),
    )
    op.create_index("ix_guest_access_id", "guest_access", ["id"])
    op.create_index("ix_guest_access_event_id", "guest_access", ["event_id"])
    op.create_index("ix_guest_access_mobile", "guest_access", ["mobile"])

    op.create_table(
        "downloads",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("guest", sa.String(), nullable=False),
        sa.Column("event", sa.String(), nullable=False),
        sa.Column("photo", sa.String(), nullable=False),
        sa.Column("size", sa.String(), nullable=False),
        sa.Column("time", sa.String(), nullable=True),
    )
    op.create_index("ix_downloads_id", "downloads", ["id"])
    op.create_index("ix_downloads_event", "downloads", ["event"])

    op.create_table(
        "payments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("client", sa.String(), nullable=False),
        sa.Column("event", sa.String(), nullable=False),
        sa.Column("amount", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True, default="Paid"),
        sa.Column("date", sa.String(), nullable=True),
    )
    op.create_index("ix_payments_id", "payments", ["id"])
    op.create_index("ix_payments_event", "payments", ["event"])

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("date", sa.String(), nullable=True),
    )
    op.create_index("ix_contact_messages_id", "contact_messages", ["id"])

    op.create_table(
        "photo_selections",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_id", sa.String(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("photo_id", sa.Integer(), sa.ForeignKey("photos.id"), nullable=False),
        sa.Column("guest_mobile", sa.String(), nullable=False),
        sa.Column("guest_name", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True, default="Selected"),
        sa.Column("created_at", sa.String(), nullable=True),
    )
    op.create_index("ix_photo_selections_id", "photo_selections", ["id"])
    op.create_index("ix_photo_selections_event_id", "photo_selections", ["event_id"])
    op.create_index("ix_photo_selections_photo_id", "photo_selections", ["photo_id"])
    op.create_index("ix_photo_selections_guest_mobile", "photo_selections", ["guest_mobile"])

    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value", sa.String(), nullable=True, default=""),
    )
    op.create_index("ix_system_settings_key", "system_settings", ["key"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("actor_id", sa.String(), nullable=True, default=""),
        sa.Column("actor_email", sa.String(), nullable=True, default=""),
        sa.Column("actor_role", sa.String(), nullable=True, default=""),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=True, default=""),
        sa.Column("resource_id", sa.String(), nullable=True, default=""),
        sa.Column("result", sa.String(), nullable=False, default="success"),
        sa.Column("ip_address", sa.String(), nullable=True, default=""),
        sa.Column("user_agent", sa.String(), nullable=True, default=""),
        sa.Column("details", sa.Text(), nullable=True, default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_actor_email", "audit_logs", ["actor_email"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"])
    op.create_index("ix_audit_logs_resource_id", "audit_logs", ["resource_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    for table_name in [
        "audit_logs",
        "system_settings",
        "photo_selections",
        "contact_messages",
        "payments",
        "downloads",
        "guest_access",
        "search_logs",
        "faces",
        "photos",
        "events",
        "users",
    ]:
        op.drop_table(table_name)
