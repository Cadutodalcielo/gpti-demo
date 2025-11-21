import os
import base64
from typing import Dict, List
from datetime import datetime
from decimal import Decimal
from pdf2image import convert_from_path
from openai import OpenAI
import json
from io import BytesIO

client = None
    
def get_openai_client():
    global client
    if client is None:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client

def process_expense_pdf(pdf_path: str) -> List[Dict]:
    client = get_openai_client()
    try:
        images = convert_from_path(pdf_path, first_page=1, last_page=5)
        
        if not images:
            return [_default_response("No se pudieron extraer imágenes del PDF")]
        
        image_contents = []
        
        for image in images:
            buffer = BytesIO()
            image.save(buffer, format='JPEG', quality=85)
            image_bytes = buffer.getvalue()
            
            image_data = base64.b64encode(image_bytes).decode('utf-8')
            image_contents.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{image_data}",
                    "detail": "high"
                }
            })
        
        prompt_text = f"""Analiza esta CARTOLA BANCARIA y extrae TODAS LAS TRANSACCIONES (cargos Y abonos).

IMPORTANTE - EXTRAE TODO:
- Extrae CADA transacción individual de la cartola
- Incluye CARGOS: pagos, compras, retiros, traspasos salientes
- Incluye ABONOS: depósitos, transferencias recibidas, devoluciones, ingresos
- NO incluyas: SALDO INICIAL, SALDO FINAL (líneas de resumen)

IMPORTANTE SOBRE MONEDA:
- Los montos están en PESOS CHILENOS (CLP)
- NO incluyas símbolos de moneda ($) en el campo amount
- Usa solo el número (ejemplo: 76110, no $76.110)
- Sin puntos ni comas como separadores de miles
- Todos los montos deben ser números positivos

Clasifica cada transacción según:
- Categoría: Determina una categoría descriptiva y apropiada según la naturaleza de la transacción (ejemplos: "Supermercado", "Restaurante", "Transporte público", "Gasolina", "Servicios básicos", "Salud", "Educación", "Entretenimiento", "Ropa", "Transferencia bancaria", "Salario", "Reembolso", etc.). La categoría debe ser clara, específica y en español. Usa categorías consistentes para transacciones similares.
- Monto (solo números enteros positivos, sin símbolos ni separadores)
- Fecha (YYYY-MM-DD)
- Vendedor/comercio
- Tipo: "fixed" (suscripciones, arriendos, servicios recurrentes) o "variable" (compras ocasionales)
- Tipo de transacción (MUY IMPORTANTE):
  * "cargo": Pagos, compras, retiros, cargos, gastos, traspasos salientes (aparece en columna CARGO o con signo negativo)
  * "abono": Depósitos, transferencias recibidas, devoluciones, ingresos (aparece en columna ABONO/DEPOSITO o con signo positivo)
- Agrega análisis de IA para el origen del movimiento:
  * "charge_archetype": describe en 2-4 palabras el tipo de transacción (ej: "Comida rápida", "Transferencia familiar", "Suscripción streaming").
  * "charge_origin": explica en máximo 20 palabras quién/qué originó el cargo o abono y el motivo.

Responde con un ARRAY JSON con TODAS las transacciones:
[
  {{
    "category": "categoría",
    "amount": 76110,
    "date": "2025-09-01",
    "vendor": "nombre del negocio",
    "description": "descripción breve",
    "is_fixed": "fixed o variable",
    "channel": "online|pos|atm o null",
    "merchant_normalized": "nombre limpio sin sufijos",
    "transaction_type": "cargo o abono",
    "charge_archetype": "tipo general detectado",
    "charge_origin": "explicación corta"
  }},
  ...más transacciones...
]

Si no hay transacciones: responde con array vacío []"""

        message_content = [{"type": "text", "text": prompt_text}] + image_contents
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": message_content
                }
            ],
        )
        
        result_text = response.choices[0].message.content.strip()
        
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        
        transactions = json.loads(result_text.strip())
        
        if not isinstance(transactions, list):
            transactions = [transactions]
        
        validated_transactions = []
        for result in transactions:
            # Validar que existe categoría, si no asignar una por defecto
            if "category" not in result or not result["category"] or not isinstance(result["category"], str):
                result["category"] = "Otros"
            else:
                # Limpiar y normalizar la categoría
                result["category"] = result["category"].strip()
                if not result["category"]:
                    result["category"] = "Otros"
            
            if "amount" in result:
                result["amount"] = Decimal(str(result["amount"]))
            else:
                result["amount"] = Decimal("0")
            
            if result.get("date"):
                try:
                    datetime.strptime(result["date"], "%Y-%m-%d")
                except:
                    result["date"] = None

            if not result.get("charge_archetype"):
                result["charge_archetype"] = "Análisis pendiente"

            if not result.get("charge_origin"):
                result["charge_origin"] = "La IA no pudo identificar el origen exacto."

            if "is_suspicious" not in result:
                result["is_suspicious"] = False

            if "suspicious_reason" not in result:
                result["suspicious_reason"] = None

            result["analysis_method"] = "gpt-4o-mini-charge-intel"
            validated_transactions.append(result)
        
        return validated_transactions if validated_transactions else [_default_response("No se encontraron transacciones")]
        
    except Exception as e:
        print(f"Error analizando PDF con GPT-5-mini: {str(e)}")
        return [_default_response(f"Error en el análisis: {str(e)}")]


def _default_response(error_msg: str) -> Dict:
    return {
        "category": "Otros",
        "amount": 0.0,
        "date": None,
        "vendor": None,
        "description": error_msg,
        "is_fixed": "variable",
        "channel": None,
        "merchant_normalized": None,
        "charge_archetype": "Análisis pendiente",
        "charge_origin": error_msg,
        "is_suspicious": False,
        "suspicious_reason": None,
        "analysis_method": "failed"
    }


# Esta función ya no se usa - las categorías ahora se obtienen dinámicamente de la BD
def get_categories() -> list:
    return []
