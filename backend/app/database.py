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


def _ensure_analysis_columns():
    """Ensure additional AI analysis columns exist even on old databases."""
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


_ensure_analysis_columns()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
