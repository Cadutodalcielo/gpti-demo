from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Dict, List, Optional

from app import models


def annotate_transactions(transactions: List[Dict], db) -> List[Dict]:
    """Annotate transactions with suspicious flags using historical expenses."""
    history = db.query(models.Expense).all()
    for transaction in transactions:
        transaction.setdefault("is_suspicious", False)
        transaction.setdefault("suspicious_reason", None)

    if not history:
        return transactions

    stats = _build_stats(history)

    for transaction in transactions:
        amount = float(transaction.get("amount") or 0)
        category = transaction.get("category")
        tx_type = transaction.get("transaction_type", "cargo")
        vendor_key = _normalize_vendor(
            transaction.get("merchant_normalized") or transaction.get("vendor")
        )

        reasons: List[str] = []
        vendor_stats = stats["vendors"].get(vendor_key) if vendor_key else None
        category_stats = stats["categories"].get(category)
        global_stats = stats["global"]

        if vendor_stats and vendor_stats["count"] >= 3:
            threshold = vendor_stats["mean"] + (2.5 * vendor_stats["std"])
            if vendor_stats["std"] == 0:
                threshold = vendor_stats["mean"] * 1.8
            if amount > threshold:
                reasons.append(
                    f"Monto inusualmente alto para {transaction.get('vendor') or 'este comercio'} "
                    f"(histórico {vendor_stats['mean']:.0f}, observado {amount:.0f})."
                )

            historic_types = vendor_stats["types"]
            if (
                tx_type == "abono"
                and historic_types.get("abono", 0) == 0
                and historic_types.get("cargo", 0) >= 3
            ):
                reasons.append(
                    "Es el primer abono asociado a este comercio, previamente solo registraba cargos."
                )
        elif (
            not vendor_stats
            and global_stats["count"] >= 15
            and amount > global_stats["p95"]
        ):
            reasons.append(
                "Comercio nuevo con un monto por sobre el percentil 95 de tu historial."
            )

        if (
            category_stats
            and category_stats["count"] >= 5
            and amount > (category_stats["p90"] * 1.4)
        ):
            reasons.append(
                f"Monto fuera de patrón para la categoría {category}. "
                f"Percentil 90: {category_stats['p90']:.0f}."
            )

        if (
            tx_type == "cargo"
            and stats["global"]["count"] >= 20
            and amount > stats["global"]["mean"] * 3.5
        ):
            reasons.append(
                "Cargo excede 3.5 veces tu gasto promedio histórico."
            )

        if reasons:
            transaction["is_suspicious"] = True
            transaction["suspicious_reason"] = " ".join(reasons)

    return transactions


def _build_stats(expenses: List[models.Expense]) -> Dict:
    global_amounts: List[float] = []
    category_amounts: Dict[str, List[float]] = defaultdict(list)
    vendor_amounts: Dict[str, Dict[str, object]] = defaultdict(
        lambda: {"amounts": [], "types": defaultdict(int)}
    )

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

