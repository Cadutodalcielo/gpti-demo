from pydantic import BaseModel, field_validator
from typing import Optional, Union, Any
from datetime import date, datetime


class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: int
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class ExpenseBase(BaseModel):
    category: str
    amount: float
    date: Optional[str] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    is_fixed: str = "variable"  # "fixed" o "variable"
    channel: Optional[str] = None
    merchant_normalized: Optional[str] = None
    transaction_type: str = "cargo"  # "cargo" o "abono"


class ExpenseCreate(ExpenseBase):
    pdf_filename: str
    pdf_path: str
    analysis_method: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    is_fixed: Optional[str] = None
    channel: Optional[str] = None
    merchant_normalized: Optional[str] = None
    transaction_type: Optional[str] = None


class Expense(ExpenseBase):
    id: int
    pdf_filename: str
    pdf_path: str
    analysis_method: Optional[str] = None
    created_at: Optional[str] = None  # Hacerlo opcional
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}
    
    @field_validator('date', mode='before')
    @classmethod
    def convert_date_to_str(cls, v: Any) -> Optional[str]:
        """Acepta date objects o strings y convierte a string"""
        if v is None:
            return None
        if isinstance(v, date):
            return v.isoformat()
        return str(v) if v else None
    
    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def convert_datetime_to_str(cls, v: Any) -> Optional[str]:
        """Acepta datetime objects, strings o None"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.isoformat()
        if isinstance(v, str):
            return v
        return str(v) if v else None


# Schemas para el dashboard
class DashboardStats(BaseModel):
    """Estadísticas agregadas para el dashboard"""
    total_expenses: float
    total_transactions: int
    average_ticket: float
    fixed_percentage: float
    variable_percentage: float
    total_charges: float  # Total de cargos
    total_deposits: float  # Total de abonos
    net_flow: float  # Flujo neto (abonos - cargos)
    categories_breakdown: dict
    monthly_evolution: list
    top_merchants: list
