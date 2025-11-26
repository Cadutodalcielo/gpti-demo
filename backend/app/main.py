from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app import models, schemas
from pydantic import BaseModel

# Allow fields prefixed with model_ used by some dependencies (e.g., docling) without warnings.
BaseModel.model_config["protected_namespaces"] = ()

from app.services import openai_service, suspicious_detector
from typing import List, Optional
import uuid
import shutil
from pathlib import Path


UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="GPTI Demo API",
    description="PDF Expense Analyzer with OpenAI",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    from app.database import ensure_schema_updates, engine, Base
    Base.metadata.create_all(bind=engine)
    ensure_schema_updates()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "message": "Bienvenidos a nuestra demo",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Configuración de sensibilidad (por ahora en memoria, luego se puede hacer persistente)
_user_sensitivity = {}  # En producción, esto debería estar en base de datos


@app.get("/settings/sensitivity")
def get_sensitivity():
    """Obtiene el nivel de sensibilidad configurado (default: standard)"""
    # Por ahora retorna default, luego se puede obtener de base de datos por usuario
    return {"sensitivity": "standard"}


class SensitivityRequest(BaseModel):
    sensitivity: str

@app.post("/settings/sensitivity")
def set_sensitivity(request: SensitivityRequest):
    """Configura el nivel de sensibilidad"""
    sensitivity = request.sensitivity
    if sensitivity not in ["conservative", "standard", "strict"]:
        raise HTTPException(status_code=400, detail="Sensitivity must be: conservative, standard, or strict")
    # Por ahora solo retorna, luego se puede guardar en base de datos
    return {"sensitivity": sensitivity, "message": "Sensitivity updated"}


@app.post("/items/", response_model=schemas.Item)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    db_item = models.Item(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/items/", response_model=List[schemas.Item])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(models.Item).offset(skip).limit(limit).all()
    return items


@app.get("/items/{item_id}", response_model=schemas.Item)
def read_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.put("/items/{item_id}", response_model=schemas.Item)
def update_item(item_id: int, item: schemas.ItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted successfully"}


@app.post("/expenses/upload")
async def upload_expense(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_extension = ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    try:
        transactions = openai_service.process_expense_pdf(str(file_path))
        # Obtener sensibilidad desde query param o usar default
        sensitivity = "standard"  # Por ahora fijo, luego se puede hacer configurable
        transactions = suspicious_detector.annotate_transactions(transactions, db, sensitivity)
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error analyzing PDF: {str(e)}")
    
    created_expenses = []
    for transaction in transactions:
        expense_data = {
            "category": transaction["category"],
            "amount": transaction["amount"],
            "date": transaction.get("date"),
            "vendor": transaction.get("vendor"),
            "description": transaction.get("description"),
            "is_fixed": transaction.get("is_fixed", "variable"),
            "channel": transaction.get("channel"),
            "merchant_normalized": transaction.get("merchant_normalized"),
            "merchant_category": transaction.get("merchant_category"),
            "transaction_type": transaction.get("transaction_type", "cargo"),
            "charge_archetype": transaction.get("charge_archetype"),
            "charge_origin": transaction.get("charge_origin"),
            "is_suspicious": transaction.get("is_suspicious", False),
            "suspicious_reason": transaction.get("suspicious_reason"),
            "suspicion_score": transaction.get("suspicion_score"),
            "pdf_filename": file.filename,
            "pdf_path": str(file_path),
            "analysis_method": transaction.get("analysis_method")
        }
        
        db_expense = models.Expense(**expense_data)
        db.add(db_expense)
        created_expenses.append(expense_data)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{len(created_expenses)} transacciones procesadas",
        "count": len(created_expenses),
        "pdf_filename": file.filename,
        "transactions": created_expenses
    }


@app.get("/expenses/", response_model=List[schemas.Expense])
def get_expenses(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Expense)
    
    if category:
        query = query.filter(models.Expense.category == category)
    
    expenses = query.order_by(models.Expense.created_at.desc()).offset(skip).limit(limit).all()
    return expenses


@app.get("/expenses/categories/list")
def get_categories(db: Session = Depends(get_db)):
    """Obtiene las categorías únicas existentes en la base de datos"""
    categories = db.query(models.Expense.category).distinct().all()
    # Extraer las categorías de las tuplas y filtrar None/vacías
    category_list = sorted([cat[0] for cat in categories if cat[0] and cat[0].strip()])
    return {"categories": category_list}


@app.get("/expenses/stats", response_model=schemas.DashboardStats)
def get_expenses_stats(
    month: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from collections import defaultdict
    
    query = db.query(models.Expense)
    
    if month:
        query = query.filter(models.Expense.date.like(f"{month}%"))
    
    expenses = query.all()
    
    if not expenses:
        return schemas.DashboardStats(
            total_expenses=0.0,
            total_transactions=0,
            average_ticket=0.0,
            fixed_percentage=0.0,
            variable_percentage=0.0,
            total_charges=0.0,
            total_deposits=0.0,
            net_flow=0.0,
            categories_breakdown={},
            monthly_evolution=[],
            balance_evolution=[],
            top_merchants=[],
            charge_type_summary={
                "suscripciones": {"amount": 0.0, "count": 0},
                "compras_diarias": {"amount": 0.0, "count": 0},
                "pagos_excepcionales": {"amount": 0.0, "count": 0},
                "otros": {"amount": 0.0, "count": 0}
            }
        )
    
    total = sum(e.amount for e in expenses)
    count = len(expenses)
    avg_ticket = total / count if count > 0 else 0
    
    total_charges = sum(e.amount for e in expenses if getattr(e, 'transaction_type', 'cargo') == 'cargo')
    total_deposits = sum(e.amount for e in expenses if getattr(e, 'transaction_type', 'cargo') == 'abono')
    net_flow = total_deposits - total_charges
    
    fixed_total = sum(e.amount for e in expenses if e.is_fixed == "fixed")
    variable_total = sum(e.amount for e in expenses if e.is_fixed == "variable")
    fixed_pct = (fixed_total / total * 100) if total > 0 else 0
    variable_pct = (variable_total / total * 100) if total > 0 else 0
    
    categories = defaultdict(lambda: {"amount": 0, "count": 0})
    for e in expenses:
        categories[e.category]["amount"] += e.amount
        categories[e.category]["count"] += 1
    
    categories_breakdown = {
        cat: {
            "amount": data["amount"],
            "count": data["count"],
            "percentage": (data["amount"] / total * 100) if total > 0 else 0
        }
        for cat, data in categories.items()
    }
    
    monthly_charges = defaultdict(float)
    monthly_deposits = defaultdict(float)
    daily_balance = []
    
    for e in expenses:
        if e.date:
            month_key = e.date[:7]
            tx_type = getattr(e, 'transaction_type', 'cargo')
            if tx_type == 'cargo':
                monthly_charges[month_key] += e.amount
            else:
                monthly_deposits[month_key] += e.amount
    
    monthly_evolution = []
    all_months = sorted(set(list(monthly_charges.keys()) + list(monthly_deposits.keys())))
    for month in all_months:
        monthly_evolution.append({
            "month": month,
            "charges": monthly_charges.get(month, 0.0),
            "deposits": monthly_deposits.get(month, 0.0)
        })
    
    # Calcular evolución del saldo (acumulado)
    sorted_expenses = sorted([e for e in expenses if e.date], key=lambda x: x.date)
    current_balance = 0.0
    balance_evolution = []
    
    for e in sorted_expenses:
        tx_type = getattr(e, 'transaction_type', 'cargo')
        if tx_type == 'abono':
            current_balance += e.amount
        else:
            current_balance -= e.amount
        
        balance_evolution.append({
            "date": e.date,
            "balance": current_balance
        })
    
    merchants = defaultdict(lambda: {"amount": 0, "count": 0})
    for e in expenses:
        merchant = e.merchant_normalized or e.vendor or "Desconocido"
        merchants[merchant]["amount"] += e.amount
        merchants[merchant]["count"] += 1
    
    top_merchants = sorted(
        [
            {
                "merchant": merchant,
                "amount": data["amount"],
                "count": data["count"],
                "avg_ticket": data["amount"] / data["count"]
            }
            for merchant, data in merchants.items()
        ],
        key=lambda x: x["amount"],
        reverse=True
    )[:10]
    
    # Clasificar cargos por tipo (suscripciones, compras diarias, pagos excepcionales)
    charge_type_summary = {
        "suscripciones": {"amount": 0.0, "count": 0},
        "compras_diarias": {"amount": 0.0, "count": 0},
        "pagos_excepcionales": {"amount": 0.0, "count": 0},
        "otros": {"amount": 0.0, "count": 0}
    }
    
    for e in expenses:
        if getattr(e, 'transaction_type', 'cargo') == 'cargo':
            archetype_lower = (e.charge_archetype or "").lower()
            merchant_cat_lower = (e.merchant_category or "").lower()
            
            # Detectar suscripciones
            if any(keyword in archetype_lower for keyword in ['suscripción', 'suscripcion', 'subscription', 'recurrente', 'mensual']):
                charge_type_summary["suscripciones"]["amount"] += e.amount
                charge_type_summary["suscripciones"]["count"] += 1
            # Detectar compras diarias (comida, transporte, supermercado)
            elif any(keyword in archetype_lower or keyword in merchant_cat_lower for keyword in 
                    ['comida', 'restaurante', 'supermercado', 'transporte', 'gasolinera', 'cafetería', 'cafeteria']):
                charge_type_summary["compras_diarias"]["amount"] += e.amount
                charge_type_summary["compras_diarias"]["count"] += 1
            # Detectar pagos excepcionales (montos altos, servicios, pagos únicos)
            elif e.is_fixed == "fixed" or e.amount > (avg_ticket * 3):
                charge_type_summary["pagos_excepcionales"]["amount"] += e.amount
                charge_type_summary["pagos_excepcionales"]["count"] += 1
            else:
                charge_type_summary["otros"]["amount"] += e.amount
                charge_type_summary["otros"]["count"] += 1
    
    return schemas.DashboardStats(
        total_expenses=total,
        total_transactions=count,
        average_ticket=avg_ticket,
        fixed_percentage=fixed_pct,
        variable_percentage=variable_pct,
        total_charges=total_charges,
        total_deposits=total_deposits,
        net_flow=net_flow,
        categories_breakdown=categories_breakdown,
        monthly_evolution=monthly_evolution,
        balance_evolution=balance_evolution,
        top_merchants=top_merchants,
        charge_type_summary=charge_type_summary
    )


@app.get("/expenses/{expense_id}", response_model=schemas.Expense)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@app.put("/expenses/{expense_id}", response_model=schemas.Expense)
def update_expense(
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db)
):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = expense_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_expense, key, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    try:
        pdf_path = Path(db_expense.pdf_path)
        if pdf_path.exists():
            pdf_path.unlink()
    except Exception as e:
        print(f"Error deleting PDF file: {str(e)}")
    
    db.delete(db_expense)
    db.commit()
    return {"message": "Expense deleted successfully"}
