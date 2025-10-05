from sqlalchemy import Column, Integer, String, Float, DateTime, Numeric, Date, Text
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
    date = Column(String, nullable=True)  # Almacenado como string ISO
    vendor = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    pdf_filename = Column(String, nullable=False)
    pdf_path = Column(String, nullable=False)
    analysis_method = Column(String, nullable=True)
    # Nuevos campos para dashboard avanzado
    is_fixed = Column(String, default="variable")  # "fixed" o "variable"
    channel = Column(String, nullable=True)  # Ej: "online", "pos", "atm"
    merchant_normalized = Column(String, nullable=True)  # Merchant normalizado
    transaction_type = Column(String, default="cargo")  # "cargo" o "abono"
    created_at = Column(String, nullable=True)  # ISO format string
    updated_at = Column(String, nullable=True)  # ISO format string
