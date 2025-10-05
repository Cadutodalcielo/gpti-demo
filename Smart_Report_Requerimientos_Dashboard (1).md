# 📊 Smart Report – Requerimientos y Diseño de Dashboard

**Descripción general:**  
Smart Report es una aplicación web interactiva que permite a los usuarios **subir sus cartolas bancarias en PDF** y obtener al instante un análisis detallado de sus gastos. El sistema procesa los datos, clasifica transacciones con **IA**, detecta **desvíos y anomalías**, y genera un **dashboard dinámico** con métricas clave, tendencias y recomendaciones para optimizar el gasto.

---

## 🧩 Requerimientos funcionales (RF)

1. **RF-01 – Ingesta inmediata:**  
   Subir PDF (≤5 MB, ~1.500 transacciones). Validar formato, extraer período y avisar errores claros.

2. **RF-02 – Parsing & normalización:**  
   Extraer movimientos (fecha, merchant, monto, signo, saldo, canal) y normalizar (CLP, fechas, redondeos).

3. **RF-03 – Deduplicación:**  
   Detectar archivos o transacciones duplicadas (hash/heurística) y excluirlas.

4. **RF-04 – Catálogo y reglas:**  
   Clasificar transacciones en categorías y subcategorías; etiquetar fijo vs variable (reglas/ML).

5. **RF-05 – Re-cálculo en vivo:**  
   Actualizar todas las métricas y gráficos automáticamente tras la carga del PDF o cambios en filtros.

6. **RF-06 – Filtros de período:**  
   Selector de mes (anterior/siguiente), rango de fechas y múltiples meses para agregados conjuntos.

7. **RF-07 – Controles analíticos:**  
   Filtros por categoría, merchant, monto, canal; búsqueda y ordenamiento.

8. **RF-08 – Comparaciones:**  
   Mostrar variación m/m y vs promedio 3M; baseline configurable (últimos N meses).

9. **RF-09 – IA – desvíos/anomalías:**  
   Detección de outliers por categoría y merchant; alertas con explicación (por qué se marcó) y nivel de confianza.

10. **RF-10 – IA – acciones sugeridas:**  
    Recomendaciones contextuales (p.ej., “revisar suscripción X”, “limitar ocio a $Y”, “pago duplicado”).

11. **RF-11 – Sesiones y seguridad:**  
    Gestión de sesión, permisos básicos (visor/admin de reglas), timeout por inactividad.

---

## ⚙️ Requerimientos no funcionales (RNF)

1. **RNF-01 – Rendimiento UI:**  
   - Re-cálculo y render de vista tras cambio de filtro **p95 ≤ 1.5 s** (datasets típicos).  
   - Carga/parseo inicial de PDF **p95 ≤ 5 s**.

2. **RNF-02 – Escalabilidad local (MVP):**  
   Manejar hasta 1.500 transacciones por mes y 12 meses combinados sin degradación notable.

3. **RNF-03 – Consistencia:**  
   Resultados determinísticos para la misma entrada y versión de modelo/reglas.

4. **RNF-04 – Seguridad y privacidad:**  
   - **0 PII** en logs/exports; almacenamiento temporal encriptado y borrado seguro al finalizar.  
   - Cumplimiento de políticas internas y normativa de datos.

5. **RNF-05 – Observabilidad:**  
   Métricas de latencia, errores, tasa de anomalías; trazas por etapa (ingesta → parseo → clasificación → render).

6. **RNF-06 – Mantenibilidad:**  
   Código modular; tests unitarios ≥70% (MVP); feature flags para activar IA u otros módulos.

7. **RNF-07 – Accesibilidad:**  
   Cumplir WCAG AA mínimo (contraste, foco visible, alt-text, lectura de tablas/gráficos).

8. **RNF-08 – Portabilidad:**  
   Despliegue contenedorizado, sin dependencias no aprobadas; compatible con navegadores modernos.

9. **RNF-09 – Resiliencia:**  
   Mensajes de error accionables; reintentos controlados en parsing; la UI no debe bloquearse por fallas parciales.

---

## 🖥️ Módulos del Dashboard

### 1. **Header & filtros**
- **Selector de mes / rango / multi-mes:**  
  Cambia el período de análisis:
  - Un solo mes (ej. *Septiembre 2025*).  
  - Rango continuo (ej. *Jul–Sep 2025*).  
  - Selección múltiple no continua (ej. *Enero + Marzo + Julio*).  
  Al cambiar, la app recalcula métricas y gráficos.

- **Filtros rápidos:**  
  Categoría, merchant, rango de montos, canal y búsqueda por texto libre.

---

### 2. **KPIs principales (overview)**
- **Gasto total**, **#txs**, **ticket medio**.  
- **Variación m/m** y **vs promedio 3M**.  
- **Integridad (|Δ| cartola vs sumas)**: alerta si > $1 CLP.  
- **% fijo / variable**: distribución de gastos recurrentes vs eventuales.

> **Valor:** visión global inmediata sobre el comportamiento de gastos.

---

### 3. **Gasto por categoría**
- Gráfico **barra/donut** + tabla (monto, % total, variación m/m y vs 3M).  
- **Click = drill-down:** detalle de transacciones de la categoría seleccionada con explicación IA y flags.

---

### 4. **Evolución temporal**
- Series para gasto total y **top 3 categorías**.  
- Comparación **multi-mes** y resaltado de **picos, caídas o quiebres**.

---

### 5. **Fijo vs variable**
- Gráfico **stacked/waffle** para proporción fijo/variable.  
- **Lista de nuevos fijos** detectados (ej.: suscripciones recientes).

---

### 6. **Merchants**
- Ranking de **top merchants** por gasto/frecuencia.  
- **Ticket promedio** por comercio.  
- **Normalización de nombres** (ej.: *Netflix CL* = *Netflix Inc.*).

---

### 7. **IA – desvíos y anomalías**
- **Tarjetas de desvío:** hallazgos clave con explicación y confianza.  
- **Acciones sugeridas:** recomendaciones automáticas (p.ej., revisar duplicados, optimizar suscripciones).

---

### 8. **Detalle de transacciones**
- Tabla filtrable: fecha, descripción original, merchant, monto, categoría, fijo/variable, explicación IA, flags.  
- **Exportar CSV**.

---

### 9. **Integridad de datos**
- Chequeos de sumas, duplicados, redondeos.  
- Alertas visibles si se detectan inconsistencias.

---

### 10. **Bitácora y versión**
- **ID de corrida**, versión de modelo/reglas y tiempos por etapa del procesamiento.  
- Útil para **auditoría y soporte técnico**.
