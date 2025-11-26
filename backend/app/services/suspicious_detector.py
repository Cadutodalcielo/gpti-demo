from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Dict, List, Optional
from datetime import datetime, time
import re

from app import models
from app.services import openai_service

# Niveles de sensibilidad
SENSITIVITY_LEVELS = {
    "conservative": {"threshold": 0.7, "multiplier": 1.5},  # Más permisivo
    "standard": {"threshold": 0.5, "multiplier": 2.0},      # Estándar
    "strict": {"threshold": 0.3, "multiplier": 2.5},       # Más estricto
}

DEFAULT_SENSITIVITY = "standard"


def annotate_transactions(transactions: List[Dict], db, sensitivity: str = DEFAULT_SENSITIVITY, exclude_vendors: Optional[List[str]] = None) -> List[Dict]:
    """Annotate transactions with suspicious flags using historical expenses.
    
    Args:
        transactions: List of transaction dictionaries to analyze
        db: Database session
        sensitivity: Sensitivity level ('conservative', 'standard', 'strict')
        exclude_vendors: Optional list of vendor names to exclude from history (for current batch)
    """
    # Obtener historial completo
    all_history = db.query(models.Expense).all()
    sensitivity_config = SENSITIVITY_LEVELS.get(sensitivity, SENSITIVITY_LEVELS[DEFAULT_SENSITIVITY])
    
    # Inicializar todas las transacciones
    for transaction in transactions:
        transaction.setdefault("is_suspicious", False)
        transaction.setdefault("suspicious_reason", None)
        transaction.setdefault("suspicion_score", 0.0)

    # Si no hay historial, retornar sin análisis
    if not all_history:
        print(f"[SuspiciousDetector] No hay historial disponible. Se procesaron {len(transactions)} transacciones sin análisis.")
        return transactions

    # Filtrar historial para excluir las transacciones del lote actual si se proporcionan
    # Esto evita que las transacciones se comparen consigo mismas
    if exclude_vendors:
        exclude_normalized = {_normalize_vendor(v) for v in exclude_vendors if v}
        history = [
            exp for exp in all_history 
            if _normalize_vendor(exp.merchant_normalized or exp.vendor) not in exclude_normalized
        ]
        print(f"[SuspiciousDetector] Historial filtrado: {len(history)} de {len(all_history)} transacciones (excluyendo {len(exclude_vendors)} del lote actual)")
    else:
        history = all_history
    
    # Si después de filtrar no queda historial suficiente, usar todo el historial
    if len(history) < 5:
        history = all_history
        print(f"[SuspiciousDetector] Usando todo el historial ({len(history)} transacciones) - historial filtrado insuficiente")

    stats = _build_stats(history)
    print(f"[SuspiciousDetector] Analizando {len(transactions)} transacciones con historial de {len(history)} transacciones")

    for transaction in transactions:
        amount = float(transaction.get("amount") or 0)
        category = transaction.get("category")
        tx_type = transaction.get("transaction_type", "cargo")
        vendor_key = _normalize_vendor(
            transaction.get("merchant_normalized") or transaction.get("vendor")
        )
        transaction_date = transaction.get("date")
        merchant_category = transaction.get("merchant_category")

        reasons: List[str] = []
        suspicion_score = 0.0
        vendor_stats = stats["vendors"].get(vendor_key) if vendor_key else None
        category_stats = stats["categories"].get(category)
        global_stats = stats["global"]

        # 1. Análisis de monto por comercio
        if vendor_stats and vendor_stats["count"] >= 3:
            threshold = vendor_stats["mean"] + (sensitivity_config["multiplier"] * vendor_stats["std"])
            if vendor_stats["std"] == 0:
                threshold = vendor_stats["mean"] * (1.5 + sensitivity_config["multiplier"] * 0.2)
            if amount > threshold:
                multiplier = amount / vendor_stats["mean"] if vendor_stats["mean"] > 0 else 0
                score_increase = min(0.4, multiplier / 10)
                suspicion_score += score_increase
                reasons.append(
                    f"Monto {multiplier:.1f}x mayor al promedio histórico en {transaction.get('vendor') or 'este comercio'} "
                    f"(promedio: {vendor_stats['mean']:.0f}, observado: {amount:.0f})."
                )

            # Detección de cambio de tipo de transacción
            historic_types = vendor_stats["types"]
            if (
                tx_type == "abono"
                and historic_types.get("abono", 0) == 0
                and historic_types.get("cargo", 0) >= 3
            ):
                suspicion_score += 0.2
                reasons.append(
                    "Primer abono en un comercio que previamente solo registraba cargos."
                )
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
            and stats["global"]["count"] >= 20
            and amount > stats["global"]["mean"] * (2.5 + sensitivity_config["multiplier"] * 0.5)
        ):
            multiplier = amount / stats["global"]["mean"] if stats["global"]["mean"] > 0 else 0
            suspicion_score += min(0.3, multiplier / 12)
            reasons.append(
                f"Cargo {multiplier:.1f}x superior a tu gasto promedio histórico ({stats['global']['mean']:.0f})."
            )

        # 4. Análisis de fecha/horario (si está disponible)
        if transaction_date:
            date_analysis = _analyze_date_pattern(transaction_date, history, stats)
            if date_analysis["is_unusual"]:
                suspicion_score += date_analysis["score"]
                reasons.append(date_analysis["reason"])

        # 5. Análisis de frecuencia de comercio
        if vendor_key and vendor_key in stats["vendor_frequency"]:
            freq_stats = stats["vendor_frequency"][vendor_key]
            days_since_last = _days_since_last_transaction(transaction_date, freq_stats["last_date"])
            if days_since_last > 0 and days_since_last > freq_stats["avg_interval"] * 3:
                suspicion_score += 0.15
                reasons.append(
                    f"Transacción después de {days_since_last} días, cuando el intervalo promedio es de {freq_stats['avg_interval']:.0f} días."
                )

        # 6. Análisis de categoría de comercio atípica
        if merchant_category and vendor_key:
            vendor_categories = stats["vendor_categories"].get(vendor_key, set())
            if merchant_category not in vendor_categories and len(vendor_categories) > 0:
                suspicion_score += 0.1
                reasons.append(
                    f"Comercio con categoría '{merchant_category}' diferente a sus categorías históricas."
                )

        # Aplicar umbral de sensibilidad
        transaction["suspicion_score"] = min(1.0, suspicion_score)
        if suspicion_score >= sensitivity_config["threshold"]:
            transaction["is_suspicious"] = True
            
            # Generar explicación mejorada con IA si hay razones
            if reasons:
                historical_context = {
                    "avg_amount": global_stats.get("mean", 0),
                    "total_transactions": global_stats.get("count", 0),
                }
                try:
                    transaction["suspicious_reason"] = openai_service.generate_suspicious_explanation(
                        transaction, reasons, historical_context
                    )
                except:
                    # Fallback a explicación simple si falla IA
                    transaction["suspicious_reason"] = " | ".join(reasons)
            else:
                transaction["suspicious_reason"] = "Movimiento marcado como sospechoso por el sistema."

    return transactions


def _build_stats(expenses: List[models.Expense]) -> Dict:
    global_amounts: List[float] = []
    category_amounts: Dict[str, List[float]] = defaultdict(list)
    vendor_amounts: Dict[str, Dict[str, object]] = defaultdict(
        lambda: {"amounts": [], "types": defaultdict(int), "dates": []}
    )
    vendor_categories: Dict[str, set] = defaultdict(set)
    vendor_frequency: Dict[str, Dict] = defaultdict(lambda: {"dates": [], "last_date": None})

    for expense in expenses:
        try:
            amount = float(expense.amount or 0)
        except (TypeError, ValueError):
            continue

        global_amounts.append(amount)
        if expense.category:
            category_amounts[expense.category].append(amount)

        vendor_key = _normalize_vendor(
            expense.merchant_normalized or expense.vendor
        )
        if vendor_key:
            vendor_amounts[vendor_key]["amounts"].append(amount)
            vendor_amounts[vendor_key]["types"][expense.transaction_type or "cargo"] += 1
            if expense.date:
                vendor_amounts[vendor_key]["dates"].append(expense.date)
                vendor_frequency[vendor_key]["dates"].append(expense.date)
            if expense.merchant_category:
                vendor_categories[vendor_key].add(expense.merchant_category)

    # Calcular frecuencias de comercios
    for vendor_key, freq_data in vendor_frequency.items():
        dates = sorted([d for d in freq_data["dates"] if d])
        if len(dates) > 1:
            intervals = []
            for i in range(1, len(dates)):
                try:
                    date1 = datetime.strptime(dates[i-1], "%Y-%m-%d")
                    date2 = datetime.strptime(dates[i], "%Y-%m-%d")
                    intervals.append((date2 - date1).days)
                except:
                    pass
            if intervals:
                freq_data["avg_interval"] = mean(intervals)
                freq_data["last_date"] = dates[-1]
            else:
                freq_data["avg_interval"] = 0
                freq_data["last_date"] = dates[0] if dates else None
        elif dates:
            freq_data["last_date"] = dates[0]
            freq_data["avg_interval"] = 0

    return {
        "global": _metrics(global_amounts),
        "categories": {k: _metrics(v) for k, v in category_amounts.items()},
        "vendors": {
            k: {
                **_metrics(data["amounts"]),
                "types": dict(data["types"]),
            }
            for k, data in vendor_amounts.items()
        },
        "vendor_categories": dict(vendor_categories),
        "vendor_frequency": dict(vendor_frequency),
    }


def _metrics(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"count": 0, "mean": 0.0, "std": 0.0, "median": 0.0, "p90": 0.0, "p95": 0.0}

    sorted_vals = sorted(values)
    count = len(sorted_vals)
    avg = mean(sorted_vals)
    std = _std(sorted_vals, avg)
    median = _percentile(sorted_vals, 0.5)
    p90 = _percentile(sorted_vals, 0.9)
    p95 = _percentile(sorted_vals, 0.95)

    return {
        "count": count,
        "mean": avg,
        "std": std,
        "median": median,
        "p90": p90,
        "p95": p95,
    }


def _std(values: List[float], avg: float) -> float:
    if len(values) < 2:
        return 0.0
    variance = sum((value - avg) ** 2 for value in values) / len(values)
    return variance ** 0.5


def _percentile(values: List[float], percentile: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]

    k = (len(values) - 1) * percentile
    lower = int(k)
    upper = min(lower + 1, len(values) - 1)
    weight = k - lower
    return values[lower] * (1 - weight) + values[upper] * weight


def _normalize_vendor(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    return name.strip().lower()


def _analyze_date_pattern(transaction_date: str, history: List[models.Expense], stats: Dict) -> Dict:
    """Analiza si la fecha/horario de la transacción es inusual."""
    try:
        tx_datetime = datetime.strptime(transaction_date, "%Y-%m-%d")
        tx_weekday = tx_datetime.weekday()  # 0 = lunes, 6 = domingo
        
        # Obtener días de la semana más comunes en el historial
        weekday_counts = defaultdict(int)
        for expense in history:
            if expense.date:
                try:
                    exp_date = datetime.strptime(expense.date, "%Y-%m-%d")
                    weekday_counts[exp_date.weekday()] += 1
                except:
                    pass
        
        if weekday_counts:
            most_common_weekday = max(weekday_counts.items(), key=lambda x: x[1])[0]
            total_transactions = sum(weekday_counts.values())
            weekday_frequency = weekday_counts[tx_weekday] / total_transactions if total_transactions > 0 else 0
            
            # Si el día de la semana es muy poco frecuente (< 5% de las transacciones)
            if weekday_frequency < 0.05 and total_transactions > 20:
                return {
                    "is_unusual": True,
                    "score": 0.1,
                    "reason": f"Transacción en {_weekday_name(tx_weekday)}, día poco frecuente en tu historial."
                }
    
    except:
        pass
    
    return {"is_unusual": False, "score": 0.0, "reason": ""}


def _weekday_name(weekday: int) -> str:
    """Convierte número de día de la semana a nombre."""
    days = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    return days[weekday] if 0 <= weekday < 7 else "día desconocido"


def _days_since_last_transaction(transaction_date: Optional[str], last_date: Optional[str]) -> int:
    """Calcula días desde la última transacción."""
    if not transaction_date or not last_date:
        return -1
    try:
        tx_date = datetime.strptime(transaction_date, "%Y-%m-%d")
        last = datetime.strptime(last_date, "%Y-%m-%d")
        return (tx_date - last).days
    except:
        return -1

