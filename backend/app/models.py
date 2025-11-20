from sqlalchemy import Column, Integer, String, Float, DateTime, Numeric, Date, Text, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(String, nullable=True)
    vendor = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    pdf_filename = Column(String, nullable=False)
    pdf_path = Column(String, nullable=False)
    analysis_method = Column(String, nullable=True)
    is_fixed = Column(String, default="variable")
    channel = Column(String, nullable=True)
    merchant_normalized = Column(String, nullable=True)
    transaction_type = Column(String, default="cargo")
    charge_archetype = Column(String, nullable=True)
    charge_origin = Column(Text, nullable=True)
    is_suspicious = Column(Boolean, default=False)
    suspicious_reason = Column(Text, nullable=True)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)
