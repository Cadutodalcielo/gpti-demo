import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/expenses_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema_updates():
    """Ensure additional AI-driven columns exist in legacy databases."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE IF EXISTS expenses "
                "ADD COLUMN IF NOT EXISTS charge_archetype VARCHAR(255)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE IF EXISTS expenses "
                "ADD COLUMN IF NOT EXISTS charge_origin TEXT"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE IF EXISTS expenses "
                "ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE IF EXISTS expenses "
                "ADD COLUMN IF NOT EXISTS suspicious_reason TEXT"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE IF EXISTS expenses "
                "ADD COLUMN IF NOT EXISTS merchant_category VARCHAR(255)"
            )
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
