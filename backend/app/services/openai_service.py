import os
import base64
from typing import Dict, List
from datetime import datetime
from decimal import Decimal
from pdf2image import convert_from_path
from openai import OpenAI
import json
from io import BytesIO

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EXPENSE_CATEGORIES = [
    "Salud",
    "Comida",
    "Transporte",
    "Vivienda",
    "Entretenimiento",
    "Servicios",
    "Educación",
    "Vestimenta",
    "Personal",
    "Otros"
]


def process_expense_pdf(pdf_path: str) -> List[Dict]:
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
        
        categories_str = ", ".join(EXPENSE_CATEGORIES)
        
        prompt_text = f"""Analiza esta CARTOLA BANCARIA y extrae TODAS LAS TRANSACCIONES (cargos Y abonos).

CATEGORÍAS DISPONIBLES: {categories_str}

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
- Categoría (usa las categorías disponibles)
- Monto (solo números enteros positivos, sin símbolos ni separadores)
- Fecha (YYYY-MM-DD)
- Vendedor/comercio
- Tipo: "fixed" (suscripciones, arriendos, servicios recurrentes) o "variable" (compras ocasionales)
- Tipo de transacción (MUY IMPORTANTE):
  * "cargo": Pagos, compras, retiros, cargos, gastos, traspasos salientes (aparece en columna CARGO o con signo negativo)
  * "abono": Depósitos, transferencias recibidas, devoluciones, ingresos (aparece en columna ABONO/DEPOSITO o con signo positivo)

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
    "transaction_type": "cargo o abono"
  }},
  ...más transacciones...
]

Si no hay transacciones: responde con array vacío []"""

        message_content = [{"type": "text", "text": prompt_text}] + image_contents
        
        response = client.chat.completions.create(
            model="gpt-5",
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
            if "category" not in result or result["category"] not in EXPENSE_CATEGORIES:
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
            
            result["analysis_method"] = "gpt-5-mini"
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
        "analysis_method": "failed"
    }


def get_categories() -> list:
    return EXPENSE_CATEGORIES
