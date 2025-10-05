/**
 * Utilidades compartidas para formateo de datos
 */

/**
 * Formatea un número como moneda chilena (CLP)
 */
export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

/**
 * Formatea una fecha en formato chileno
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  
  try {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Formatea un mes YYYY-MM a formato legible
 */
export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

/**
 * Tipos de insights
 */
export interface Insight {
  type: 'alert' | 'recommendation' | 'summary';
  title: string;
  message: string;
  value?: string;
}

/**
 * Genera insights basados en las estadísticas del dashboard
 */
export function generateInsights(stats: any, expenses: any[]): Insight[] {
  const insights: Insight[] = [];

  // ALERTAS (Rojo)
  if (stats.variable_percentage > 70) {
    insights.push({
      type: 'alert',
      title: 'Alto porcentaje de gastos variables',
      message: `Los gastos variables representan el ${stats.variable_percentage.toFixed(1)}% del total. Considera crear un presupuesto más estricto.`,
    });
  }

  const otrosCategory = stats.categories_breakdown['Otros'];
  if (otrosCategory && otrosCategory.count >= 5) {
    insights.push({
      type: 'alert',
      title: 'Transacciones sin categorizar',
      message: `Hay ${otrosCategory.count} transacciones en "Otros". Revisa y reclasifica para un mejor análisis.`,
    });
  }

  if (stats.net_flow < 0) {
    insights.push({
      type: 'alert',
      title: 'Flujo neto negativo',
      message: `Tus cargos superan tus abonos en ${formatCurrency(Math.abs(stats.net_flow))}. Revisa tus gastos.`,
      value: formatCurrency(stats.net_flow),
    });
  }

  // RECOMENDACIONES (Amarillo)
  if (stats.average_ticket > 50000) {
    insights.push({
      type: 'recommendation',
      title: 'Ticket promedio elevado',
      message: `Tu gasto promedio por transacción es de ${formatCurrency(stats.average_ticket)}. Considera buscar alternativas más económicas.`,
    });
  }

  const topCategory = Object.entries(stats.categories_breakdown)
    .sort(([, a]: any, [, b]: any) => b.amount - a.amount)[0];
  
  if (topCategory && topCategory[1].percentage > 40) {
    insights.push({
      type: 'recommendation',
      title: 'Concentración de gastos',
      message: `La categoría "${topCategory[0]}" representa el ${topCategory[1].percentage.toFixed(1)}% de tus gastos. Diversifica tus gastos para mejor control.`,
    });
  }

  // RESUMEN GENERAL (Azul)
  const dailyAverage = stats.total_expenses / 30;
  insights.push({
    type: 'summary',
    title: 'Gasto promedio diario',
    message: `Basado en tus transacciones, gastas aproximadamente ${formatCurrency(dailyAverage)} por día.`,
    value: formatCurrency(dailyAverage),
  });

  if (topCategory) {
    insights.push({
      type: 'summary',
      title: 'Categoría principal',
      message: `Tu mayor gasto es en "${topCategory[0]}" con ${formatCurrency(topCategory[1].amount)} (${topCategory[1].percentage.toFixed(1)}%).`,
      value: formatCurrency(topCategory[1].amount),
    });
  }

  if (stats.net_flow > 0) {
    insights.push({
      type: 'summary',
      title: 'Flujo neto positivo',
      message: `Tus abonos superan tus cargos en ${formatCurrency(stats.net_flow)}. ¡Excelente balance!`,
      value: formatCurrency(stats.net_flow),
    });
  }

  return insights;
}

