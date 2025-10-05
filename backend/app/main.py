from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app import models, schemas
from app.services import openai_service
from typing import List, Optional
import os
import uuid
import shutil
from pathlib import Path

# Create database tables
Base.metadata.create_all(bind=engine)

# Create uploads directory
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="GPTI Demo API",
    description="PDF Expense Analyzer with OpenAI",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
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


# Example CRUD endpoints for items
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


# Expense endpoints
@app.post("/expenses/upload")
async def upload_expense(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF bank statement (cartola), analyze it with OpenAI, and store ALL transactions.
    Returns a summary with count and list of created expenses.
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique filename
    file_extension = ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Process PDF with OpenAI - returns list of transactions
    try:
        transactions = openai_service.process_expense_pdf(str(file_path))
    except Exception as e:
        # Clean up file if analysis fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error analyzing PDF: {str(e)}")
    
    # Create multiple expense records in database
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
            "transaction_type": transaction.get("transaction_type", "cargo"),
            "pdf_filename": file.filename,
            "pdf_path": str(file_path),
            "analysis_method": transaction.get("analysis_method")
        }
        
        db_expense = models.Expense(**expense_data)
        db.add(db_expense)
        created_expenses.append(expense_data)
    
    # Commit all transactions at once
    db.commit()
    
    # Return summary
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
    """
    Get list of expenses with optional category filter.
    """
    query = db.query(models.Expense)
    
    if category:
        query = query.filter(models.Expense.category == category)
    
    expenses = query.order_by(models.Expense.created_at.desc()).offset(skip).limit(limit).all()
    return expenses


@app.get("/expenses/categories/list")
def get_categories():
    """
    Get list of available expense categories.
    """
    return {"categories": openai_service.get_categories()}


@app.get("/expenses/stats", response_model=schemas.DashboardStats)
def get_expenses_stats(
    month: Optional[str] = None,  # Formato: "2025-09"
    db: Session = Depends(get_db)
):
    """
    Get aggregated statistics for the dashboard.
    """
    from sqlalchemy import func, extract
    from collections import defaultdict
    from datetime import datetime
    
    query = db.query(models.Expense)
    
    # Filtrar por mes si se proporciona
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
            top_merchants=[]
        )
    
    # Cálculos básicos
    total = sum(e.amount for e in expenses)
    count = len(expenses)
    avg_ticket = total / count if count > 0 else 0
    
    # Cargos y Abonos
    total_charges = sum(e.amount for e in expenses if getattr(e, 'transaction_type', 'cargo') == 'cargo')
    total_deposits = sum(e.amount for e in expenses if getattr(e, 'transaction_type', 'cargo') == 'abono')
    net_flow = total_deposits - total_charges
    
    # Fixed vs Variable
    fixed_total = sum(e.amount for e in expenses if e.is_fixed == "fixed")
    variable_total = sum(e.amount for e in expenses if e.is_fixed == "variable")
    fixed_pct = (fixed_total / total * 100) if total > 0 else 0
    variable_pct = (variable_total / total * 100) if total > 0 else 0
    
    # Breakdown por categoría
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
    
    # Evolución mensual
    monthly_data = defaultdict(float)
    for e in expenses:
        if e.date:
            month_key = e.date[:7]  # "2025-09"
            monthly_data[month_key] += e.amount
    
    monthly_evolution = [
        {"month": month, "amount": amount}
        for month, amount in sorted(monthly_data.items())
    ]
    
    # Top merchants
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
        top_merchants=top_merchants
    )


@app.get("/expenses/{expense_id}", response_model=schemas.Expense)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """
    Get a specific expense by ID.
    """
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
    """
    Update an expense record.
    """
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Update only provided fields
    update_data = expense_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_expense, key, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """
    Delete an expense and its associated PDF file.
    """
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Delete PDF file
    try:
        pdf_path = Path(db_expense.pdf_path)
        if pdf_path.exists():
            pdf_path.unlink()
    except Exception as e:
        print(f"Error deleting PDF file: {str(e)}")
    
    # Delete database record
    db.delete(db_expense)
    db.commit()
    return {"message": "Expense deleted successfully"}
