from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite:")

engine_options = {"pool_pre_ping": True}
if _is_sqlite:
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL connection pool shared by each uvicorn worker. Stale
    # connections are checked before use and recycled after 30 minutes.
    engine_options.update(pool_size=10, max_overflow=20, pool_recycle=1800)

engine = create_engine(settings.DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
