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
        
        # Extraer nombres de comercios del lote actual para excluirlos del historial
        current_vendors = [
            tx.get("merchant_normalized") or tx.get("vendor") 
            for tx in transactions 
            if tx.get("merchant_normalized") or tx.get("vendor")
        ]
        
        transactions = suspicious_detector.annotate_transactions(
            transactions, db, sensitivity, exclude_vendors=current_vendors
        )
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


@app.delete("/expenses/clear/all")
def delete_all_expenses(db: Session = Depends(get_db)):
    """Elimina todas las transacciones de la base de datos y sus archivos PDF asociados."""
    try:
        expenses = db.query(models.Expense).all()
        
        # Eliminar archivos PDF
        deleted_files = 0
        for expense in expenses:
            try:
                pdf_path = Path(expense.pdf_path)
                if pdf_path.exists():
                    pdf_path.unlink()
                    deleted_files += 1
            except Exception as e:
                print(f"Error deleting PDF file {expense.pdf_path}: {str(e)}")
        
        # Eliminar todas las transacciones
        count = db.query(models.Expense).delete()
        db.commit()
        
        return {
            "message": f"Todas las transacciones fueron eliminadas",
            "transactions_deleted": count,
            "files_deleted": deleted_files
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar transacciones: {str(e)}")


@app.post("/expenses/reprocess-suspicious")
def reprocess_suspicious_flags(db: Session = Depends(get_db)):
    """Reprocesa todas las transacciones para actualizar las banderas de sospecha.
    
    Usa la lógica completa del detector de forma incremental, procesando las transacciones
    en orden cronológico y comparando cada una solo con el historial previo.
    """
    try:
        # Obtener todas las transacciones ordenadas por fecha
        all_expenses = db.query(models.Expense).order_by(models.Expense.date, models.Expense.id).all()
        
        if len(all_expenses) < 5:
            return {
                "message": "No hay suficientes transacciones para analizar. Se necesitan al menos 5 transacciones.",
                "total": len(all_expenses),
                "suspicious_count": 0
            }
        
        suspicious_count = 0
        sensitivity = "standard"
        sensitivity_config = suspicious_detector.SENSITIVITY_LEVELS.get(sensitivity, suspicious_detector.SENSITIVITY_LEVELS["standard"])
        
        # Importar funciones necesarias del detector
        from app.services.suspicious_detector import _build_stats, _normalize_vendor, _analyze_date_pattern, _days_since_last_transaction
        
        # Procesar transacciones de forma incremental
        # Cada transacción se compara solo con las anteriores
        for i, expense in enumerate(all_expenses):
            # Si es una de las primeras transacciones, no hay historial suficiente
            if i < 3:
                expense.is_suspicious = False
                expense.suspicion_score = None
                expense.suspicious_reason = None
                db.add(expense)
                continue
            
            # Obtener solo las transacciones anteriores como historial
            historical_expenses = all_expenses[:i]
            
            # Construir estadísticas del historial
            stats = _build_stats(historical_expenses)
            
            # Si no hay suficiente historial, saltar
            if stats["global"]["count"] < 3:
                expense.is_suspicious = False
                expense.suspicion_score = None
                expense.suspicious_reason = None
                db.add(expense)
                continue
            
            # Preparar datos de la transacción actual
            amount = float(expense.amount or 0)
            category = expense.category
            tx_type = expense.transaction_type or "cargo"
            vendor_key = _normalize_vendor(expense.merchant_normalized or expense.vendor)
            transaction_date = expense.date
            merchant_category = expense.merchant_category
            
            # Inicializar análisis
            reasons = []
            suspicion_score = 0.0
            vendor_stats = stats["vendors"].get(vendor_key) if vendor_key else None
            category_stats = stats["categories"].get(category)
            global_stats = stats["global"]
            
            # 1. Análisis de monto por comercio (usando la lógica completa del detector)
            if vendor_stats and vendor_stats["count"] >= 3:
                threshold = vendor_stats["mean"] + (sensitivity_config["multiplier"] * vendor_stats["std"])
                if vendor_stats["std"] == 0:
                    threshold = vendor_stats["mean"] * (1.5 + sensitivity_config["multiplier"] * 0.2)
                if amount > threshold:
                    multiplier = amount / vendor_stats["mean"] if vendor_stats["mean"] > 0 else 0
                    score_increase = min(0.4, multiplier / 10)
                    suspicion_score += score_increase
                    reasons.append(
                        f"Monto {multiplier:.1f}x mayor al promedio histórico en {expense.vendor or 'este comercio'} "
                        f"(promedio: {vendor_stats['mean']:.0f}, observado: {amount:.0f})."
                    )
                
                # Detección de cambio de tipo de transacción
                historic_types = vendor_stats.get("types", {})
                if (
                    tx_type == "abono"
                    and historic_types.get("abono", 0) == 0
                    and historic_types.get("cargo", 0) >= 3
                ):
                    suspicion_score += 0.2
                    reasons.append("Primer abono en un comercio que previamente solo registraba cargos.")
            elif (
                not vendor_stats
                and global_stats["count"] >= 15
                and amount > global_stats["p95"]
            ):
                suspicion_score += 0.3
                reasons.append(
                    f"Comercio nuevo con monto superior al percentil 95 de tu historial ({global_stats['p95']:.0f})."
                )
            
            # 2. Análisis de categoría
            if (
                category_stats
                and category_stats["count"] >= 5
                and amount > (category_stats["p90"] * 1.4)
            ):
                multiplier = amount / category_stats["p90"] if category_stats["p90"] > 0 else 0
                suspicion_score += min(0.25, multiplier / 15)
                reasons.append(
                    f"Monto {multiplier:.1f}x superior al percentil 90 para la categoría '{category}' "
                    f"(percentil 90: {category_stats['p90']:.0f})."
                )
            
            # 3. Análisis global de monto
            if (
                tx_type == "cargo"
                and global_stats["count"] >= 20
                and amount > global_stats["mean"] * (2.5 + sensitivity_config["multiplier"] * 0.5)
            ):
                multiplier = amount / global_stats["mean"] if global_stats["mean"] > 0 else 0
                suspicion_score += min(0.3, multiplier / 12)
                reasons.append(
                    f"Cargo {multiplier:.1f}x superior a tu gasto promedio histórico ({global_stats['mean']:.0f})."
                )
            
            # 4. Análisis de fecha/horario
            if transaction_date:
                date_analysis = _analyze_date_pattern(transaction_date, historical_expenses, stats)
                if date_analysis["is_unusual"]:
                    suspicion_score += date_analysis["score"]
                    reasons.append(date_analysis["reason"])
            
            # 5. Análisis de frecuencia de comercio
            if vendor_key and vendor_key in stats.get("vendor_frequency", {}):
                freq_stats = stats["vendor_frequency"][vendor_key]
                days_since_last = _days_since_last_transaction(transaction_date, freq_stats.get("last_date"))
                if days_since_last > 0 and days_since_last > freq_stats.get("avg_interval", 0) * 3:
                    suspicion_score += 0.15
                    reasons.append(
                        f"Transacción después de {days_since_last} días, cuando el intervalo promedio es de {freq_stats.get('avg_interval', 0):.0f} días."
                    )
            
            # 6. Análisis de categoría de comercio atípica
            if merchant_category and vendor_key:
                vendor_categories = stats.get("vendor_categories", {}).get(vendor_key, set())
                if merchant_category not in vendor_categories and len(vendor_categories) > 0:
                    suspicion_score += 0.1
                    reasons.append(
                        f"Comercio con categoría '{merchant_category}' diferente a sus categorías históricas."
                    )
            
            # Aplicar umbral de sensibilidad
            suspicion_score = min(1.0, suspicion_score)
            
            if suspicion_score >= sensitivity_config["threshold"]:
                expense.is_suspicious = True
                expense.suspicion_score = float(suspicion_score)
                
                # Generar explicación mejorada con IA si hay razones
                if reasons:
                    historical_context = {
                        "avg_amount": global_stats.get("mean", 0),
                        "total_transactions": global_stats.get("count", 0),
                    }
                    tx_dict = {
                        "date": transaction_date,
                        "amount": amount,
                        "vendor": expense.vendor,
                        "merchant_normalized": expense.merchant_normalized,
                        "category": category,
                        "transaction_type": tx_type,
                        "charge_archetype": expense.charge_archetype,
                    }
                    try:
                        expense.suspicious_reason = openai_service.generate_suspicious_explanation(
                            tx_dict, reasons, historical_context
                        )
                    except Exception as e:
                        print(f"Error generando explicación con IA: {str(e)}")
                        expense.suspicious_reason = " | ".join(reasons)
                else:
                    expense.suspicious_reason = "Movimiento marcado como sospechoso por el sistema."
                suspicious_count += 1
            else:
                expense.is_suspicious = False
                expense.suspicion_score = float(suspicion_score) if suspicion_score > 0 else None
                expense.suspicious_reason = None
            
            db.add(expense)
        
        # Guardar todos los cambios
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al guardar cambios: {str(e)}")
        
        return {
            "message": "Transacciones reprocesadas exitosamente",
            "total": len(all_expenses),
            "suspicious_count": suspicious_count
        }
    except Exception as e:
        db.rollback()
        import traceback
        print(f"Error completo: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error al reprocesar: {str(e)}")


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
