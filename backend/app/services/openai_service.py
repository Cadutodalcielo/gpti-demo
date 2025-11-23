import os
import json
from typing import Dict, List
from datetime import datetime
from decimal import Decimal
from openai import OpenAI

try:
    from docling.document_converter import DocumentConverter
    _docling_import_error = None
except Exception as exc:  # pragma: no cover - best-effort guard for optional dep
    DocumentConverter = None  # type: ignore[assignment]
    _docling_import_error = exc

client = None

def get_openai_client():
    global client
    if client is None:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client

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


def extract_text_from_pdf(pdf_path: str) -> str:
    if DocumentConverter is None:
        missing = "Docling no está instalado" if _docling_import_error is None else str(_docling_import_error)
        raise RuntimeError(
            "Docling no está disponible para procesar PDFs. "
            f"Instálalo o revisa dependencias del sistema: {missing}"
        )
    try:
        converter = DocumentConverter()
        result = converter.convert(pdf_path)
        return result.document.export_to_markdown()
    except Exception as e:
        print(f"Error extracting text from PDF with Docling: {str(e)}")
        return ""


def process_expense_pdf(pdf_path: str) -> List[Dict]:
    client = get_openai_client()
    try:
        # Extract text instead of images
        pdf_text = extract_text_from_pdf(pdf_path)
        
        if not pdf_text.strip():
            return [_default_response("No se pudo extraer texto del PDF. Asegúrate de que no sea una imagen escaneada.")]
        
        categories_str = ", ".join(EXPENSE_CATEGORIES)
        
        prompt_text = f"""Analiza el siguiente TEXTO extraído de una CARTOLA BANCARIA y extrae TODAS LAS TRANSACCIONES.

TEXTO DE LA CARTOLA:
\"\"\"
{pdf_text}
\"\"\"

CATEGORÍAS DISPONIBLES: {categories_str}

INSTRUCCIONES:
1. Extrae CADA transacción (cargos y abonos).
2. Ignora saldos iniciales/finales.
3. Montos en CLP (sin símbolos, solo números positivos).
4. Clasifica cada una.

Responde SOLAMENTE con un JSON válido con la siguiente estructura:
{{
  "transactions": [
    {{
      "category": "categoría",
      "amount": 76110,
      "date": "YYYY-MM-DD",
      "vendor": "nombre del negocio",
      "description": "descripción breve",
      "is_fixed": "fixed" | "variable",
      "channel": "online" | "pos" | "atm" | null,
      "merchant_normalized": "nombre limpio",
      "transaction_type": "cargo" | "abono",
      "charge_archetype": "tipo general detectado",
      "charge_origin": "explicación corta"
    }}
  ]
}}

Si no hay transacciones, responde: {{ "transactions": [] }}
"""

        response = client.chat.completions.create(
            model="gpt-5.1",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un experto analista financiero que extrae datos estructurados de cartolas bancarias."
                },
                {
                    "role": "user",
                    "content": prompt_text
                }
            ],
            response_format={ "type": "json_object" }
        )
        
        result_text = response.choices[0].message.content.strip()
        data = json.loads(result_text)
        transactions = data.get("transactions", [])
        
        validated_transactions = []
        for result in transactions:
            if "category" not in result or not result["category"] or not isinstance(result["category"], str):
                result["category"] = "Otros"
            else:
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
            
            result["analysis_method"] = "gpt-4o-text"
            validated_transactions.append(result)
        
        return validated_transactions if validated_transactions else [_default_response("No se encontraron transacciones")]
        
    except Exception as e:
        print(f"Error analizando PDF con GPT-4o: {str(e)}")
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
        "analysis_method": "failed"
    }


def get_categories() -> list:
    return EXPENSE_CATEGORIES
