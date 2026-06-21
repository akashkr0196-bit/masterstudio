import json
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base, HAS_PGVECTOR

if HAS_PGVECTOR:
    from pgvector.sqlalchemy import Vector

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # e.g. U001
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="Guest") # Admin, Photographer, Client, Guest
    phone = Column(String, nullable=True, default="")
    avatar_url = Column(String, nullable=True, default="")
    brand_logo_url = Column(String, nullable=True, default="")
    brand_name = Column(String, nullable=True, default="")
    brand_rights_text = Column(String, nullable=True, default="")
    instagram_url = Column(String, nullable=True, default="")
    facebook_url = Column(String, nullable=True, default="")
    website_url = Column(String, nullable=True, default="")
    whatsapp_url = Column(String, nullable=True, default="")
    address = Column(String, nullable=True, default="")
    about_studio = Column(Text, nullable=True, default="")
    verification_status = Column(String, default="Pending Verification") # Pending Verification, Verified, Rejected
    brand_change_request = Column(Text, nullable=True, default="")
    events_count = Column(Integer, default=0)
    joined = Column(String, default=lambda: datetime.now().strftime("%b %Y"))
    plan = Column(String, default="Premium") # Premium, Enterprise
    status = Column(String, default="Active") # Active, Suspended
    storage_quota_gb = Column(Integer, default=50)
    active_session_id = Column(String, nullable=True, default="")
    password = Column(String, nullable=True, default="")
    temp_password = Column(String, nullable=True, default="")
    must_change_password = Column(Boolean, default=False)
    first_login_done = Column(Boolean, default=False)

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    date = Column(String, nullable=False)
    photos = Column(String, default="0")
    guests = Column(Integer, default=0)
    qr = Column(Boolean, default=True)
    status = Column(String, default="Active") # Active, Completed
    revenue = Column(String, default="Rs 0")
    client_name = Column(String, nullable=True, default="")
    client_mobile = Column(String, nullable=True, default="")
    photographer_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    photos_list = relationship("Photo", back_populates="event", cascade="all, delete-orphan")

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    preview_name = Column(String, nullable=True, default="")
    size = Column(String, default="0 MB")
    size_bytes = Column(Integer, default=0)
    progress = Column(Integer, default=100)
    status = Column(String, default="Completed") # Queued, Processing, Pending, Completed, Failed
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    event = relationship("Event", back_populates="photos_list")
    faces = relationship("Face", back_populates="photo", cascade="all, delete-orphan")

    @property
    def faces_count(self):
        return len(self.faces)

class Face(Base):
    __tablename__ = "faces"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False, index=True)
    bbox_x1 = Column(Float, nullable=False)
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)
    
    # Store embedding. If pgvector is present, use Vector(512), else fallback to Text
    if HAS_PGVECTOR:
        embedding = Column(Vector(512))
    else:
        embedding = Column(Text) # Stored as JSON string

    photo = relationship("Photo", back_populates="faces")

    def get_embedding(self):
        if HAS_PGVECTOR:
            return self.embedding
        return json.loads(self.embedding) if self.embedding else []

    def set_embedding(self, val):
        if HAS_PGVECTOR:
            self.embedding = val
        else:
            self.embedding = json.dumps(list(val))

class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(String, primary_key=True, index=True) # e.g. SL-001
    guest = Column(String, nullable=False)
    mobile = Column(String, nullable=True, default="", index=True)
    event = Column(String, nullable=False)
    event_id = Column(String, ForeignKey("events.id"), nullable=True, index=True)
    time = Column(String, default=lambda: datetime.now().strftime("%d %b, %I:%M %p"))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    photos = Column(Integer, default=0)
    status = Column(String, default="Completed") # Completed, Failed
    selfie_url = Column(String, nullable=True, default="")

class GuestAccess(Base):
    __tablename__ = "guest_access"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    mobile = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    search_count = Column(Integer, default=0)

class Download(Base):
    __tablename__ = "downloads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    guest = Column(String, nullable=False)
    event = Column(String, nullable=False, index=True)
    photo = Column(String, nullable=False)
    size = Column(String, nullable=False)
    time = Column(String, default=lambda: datetime.now().strftime("%d %b, %I:%M %p"))

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    client = Column(String, nullable=False)
    event = Column(String, nullable=False, index=True)
    amount = Column(String, nullable=False)
    status = Column(String, default="Paid") # Paid, Refunded, Pending
    date = Column(String, default=lambda: datetime.now().strftime("%d %b %Y"))

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    message = Column(String, nullable=False)
    date = Column(String, default=lambda: datetime.now().strftime("%d %b %Y, %I:%M %p"))

class PhotoSelection(Base):
    __tablename__ = "photo_selections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False, index=True)
    guest_mobile = Column(String, nullable=False, index=True)
    guest_name = Column(String, nullable=True)
    status = Column(String, default="Selected") # Selected, Approved, Rejected
    created_at = Column(String, default=lambda: datetime.now().strftime("%d %b %Y, %I:%M %p"))

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, default="")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    actor_id = Column(String, nullable=True, index=True, default="")
    actor_email = Column(String, nullable=True, index=True, default="")
    actor_role = Column(String, nullable=True, default="")
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=True, index=True, default="")
    resource_id = Column(String, nullable=True, index=True, default="")
    result = Column(String, nullable=False, default="success")
    ip_address = Column(String, nullable=True, default="")
    user_agent = Column(String, nullable=True, default="")
    details = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
