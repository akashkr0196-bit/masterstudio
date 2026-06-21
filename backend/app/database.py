import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

# PostgreSQL is required for production. SQLite remains available only for
# local development and quick tests.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    if APP_ENV in {"production", "prod"}:
        raise RuntimeError("DATABASE_URL is required in production and must point to PostgreSQL")
    DATABASE_URL = "sqlite:///./masterstudio.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_POSTGRES = DATABASE_URL.startswith("postgresql")
if APP_ENV in {"production", "prod"} and IS_SQLITE:
    raise RuntimeError("SQLite is not allowed in production. Use a PostgreSQL DATABASE_URL.")

# For sqlite compatibility (e.g. check_same_thread)
connect_args = {}
engine_kwargs = {"pool_pre_ping": True}
if IS_SQLITE:
    connect_args["check_same_thread"] = False
else:
    engine_kwargs.update({
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE_SECONDS", "1800")),
    })

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = IS_POSTGRES and os.getenv("ENABLE_PGVECTOR", "1") != "0"
except ImportError:
    HAS_PGVECTOR = False

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
