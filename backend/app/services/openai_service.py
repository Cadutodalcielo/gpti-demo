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
        
        # Definir categorías de merchants para clasificación granular
        merchant_categories = [
            "Supermercado", "Restaurante", "Comida rápida", "Cafetería", 
            "Transporte app", "Transporte público", "Gasolinera",
            "Farmacia", "Hospital/Clínica", "Gimnasio", "Suscripción streaming",
            "Suscripción software", "Suscripción servicio", "Tienda retail",
            "Ropa/Calzado", "Electrónica", "Librería", "Servicios públicos",
            "Banco/Financiera", "Seguros", "Educación", "Entretenimiento",
            "Hotelería", "Otros"
        ]
        merchant_categories_str = ", ".join(merchant_categories)
        
        prompt_text = f"""Analiza el siguiente TEXTO extraído de una CARTOLA BANCARIA y extrae TODAS LAS TRANSACCIONES con un análisis detallado de cada una.

TEXTO DE LA CARTOLA:
\"\"\"
{pdf_text}
\"\"\"

CATEGORÍAS DISPONIBLES: {categories_str}
CATEGORÍAS DE MERCHANTS: {merchant_categories_str}

INSTRUCCIONES DETALLADAS:
1. Extrae CADA transacción (cargos y abonos) del texto.
2. Ignora saldos iniciales/finales y movimientos internos de cuenta.
3. Montos en CLP (sin símbolos, solo números positivos).
4. Para cada transacción, realiza un análisis profundo:

   a) CATEGORÍA: Asigna una de las categorías disponibles basándote en el tipo de gasto.
   
   b) MERCHANT_NORMALIZED: Normaliza el nombre del comercio eliminando códigos, referencias bancarias innecesarias, y unificando variaciones (ej: "MCDONALDS", "MC DONALDS" → "McDonald's").
   
   c) MERCHANT_CATEGORY: Clasifica el comercio en una categoría informativa específica. Ejemplos:
      - McDonald's, Burger King, KFC → "Comida rápida"
      - Uber, DiDi, Cabify → "Transporte app"
      - Netflix, Spotify, Disney+ → "Suscripción streaming"
      - Jumbo, Lider, Tottus → "Supermercado"
      - Banco Estado, Banco de Chile → "Banco/Financiera"
      - Si es una transferencia entre cuentas propias → "Banco/Financiera"
   
   d) CHARGE_ARCHETYPE: Identifica el tipo general de transacción de manera descriptiva. Ejemplos:
      - "Suscripción mensual de streaming"
      - "Compra de comida rápida"
      - "Viaje en aplicación de transporte"
      - "Transferencia entre cuentas propias"
      - "Pago de servicios básicos"
      - "Compra en supermercado"
      - "Pago de suscripción de software"
      - "Abono por transferencia recibida"
      - "Salario o ingreso fijo"
      - "Pago excepcional o único"
   
   e) CHARGE_ORIGIN: Proporciona una explicación DETALLADA y ÚTIL del origen y razón del cargo/abono. 
      NO uses solo la categoría genérica. Sé específico y descriptivo. Ejemplos:
      - En lugar de "Comida" → "Compra de comida rápida en McDonald's, probablemente almuerzo o cena del día"
      - En lugar de "Transporte" → "Viaje en Uber desde tu ubicación habitual, posiblemente al trabajo o regreso a casa"
      - En lugar de "Entretenimiento" → "Renovación automática de suscripción mensual a Netflix para acceso a contenido streaming"
      - En lugar de "Servicios" → "Pago mensual de cuenta de luz correspondiente al período de facturación"
      - En lugar de "Abono" → "Transferencia recibida desde otra cuenta propia, posiblemente movimiento entre cuentas corrientes"
      - Para transferencias: "Transferencia entre cuentas propias del mismo banco, movimiento interno de fondos"
      - Para suscripciones: "Cobro recurrente mensual de suscripción a [servicio], renovación automática"
      - Para compras: "Compra realizada en [comercio] mediante [método de pago], probablemente [contexto según monto y hora]"
   
   f) IS_FIXED: Determina si es "fixed" (gastos recurrentes como suscripciones, servicios básicos) o "variable" (compras ocasionales).
   
   g) CHANNEL: Identifica el canal: "online" (compras por internet, apps), "pos" (pago en tienda física), "atm" (cajero automático), o null si no aplica.

IMPORTANTE: 
- El campo charge_origin DEBE ser una descripción explicativa y útil, NO solo repetir la categoría.
- Analiza el contexto (monto, fecha, comercio) para generar descripciones inteligentes.
- Para abonos, explica el origen del ingreso de manera clara.
- Para cargos, explica qué se pagó y por qué razón probable.

Responde SOLAMENTE con un JSON válido con la siguiente estructura:
{{
  "transactions": [
    {{
      "category": "categoría de {categories_str}",
      "amount": 76110,
      "date": "YYYY-MM-DD",
      "vendor": "nombre del negocio tal como aparece",
      "description": "descripción breve del texto original",
      "is_fixed": "fixed" | "variable",
      "channel": "online" | "pos" | "atm" | null,
      "merchant_normalized": "nombre limpio y normalizado",
      "merchant_category": "categoría de {merchant_categories_str}",
      "transaction_type": "cargo" | "abono",
      "charge_archetype": "tipo general descriptivo y específico",
      "charge_origin": "explicación detallada y útil del origen/razón del cargo o abono"
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
            
            # Validar y normalizar merchant_category
            if not result.get("merchant_category"):
                result["merchant_category"] = None
            else:
                result["merchant_category"] = result["merchant_category"].strip()
                if not result["merchant_category"]:
                    result["merchant_category"] = None
            
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
        "merchant_category": None,
        "charge_archetype": "Análisis pendiente",
        "charge_origin": error_msg,
        "analysis_method": "failed"
    }


def get_categories() -> list:
    return EXPENSE_CATEGORIES
