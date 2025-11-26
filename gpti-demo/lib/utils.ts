export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

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

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

export interface Insight {
  type: 'alert' | 'recommendation' | 'summary';
  title: string;
  message: string;
  value?: string;
}

export function generateInsights(stats: any, expenses: any[]): Insight[] {
  const insights: Insight[] = [];

  // Análisis de flujo neto
  if (stats.net_flow < 0) {
    const deficit = Math.abs(stats.net_flow);
    const deficitPercentage = (deficit / stats.total_charges) * 100;
    insights.push({
      type: 'alert',
      title: 'Déficit financiero detectado',
      message: `Tus gastos superan tus ingresos en ${formatCurrency(deficit)} (${deficitPercentage.toFixed(1)}% de tus cargos). Esto indica que estás gastando más de lo que recibes. Revisa tus gastos recurrentes y considera reducir gastos no esenciales.`,
      value: formatCurrency(stats.net_flow),
    });
  } else if (stats.net_flow > 0) {
    const savingsRate = (stats.net_flow / stats.total_deposits) * 100;
    insights.push({
      type: 'summary',
      title: 'Balance financiero positivo',
      message: `Tus ingresos superan tus gastos en ${formatCurrency(stats.net_flow)}, lo que representa un ${savingsRate.toFixed(1)}% de ahorro sobre tus ingresos. ${savingsRate > 20 ? '¡Excelente tasa de ahorro!' : savingsRate > 10 ? 'Buena tasa de ahorro.' : 'Considera aumentar tu tasa de ahorro.'}`,
      value: formatCurrency(stats.net_flow),
    });
  }

  // Análisis de suscripciones
  const subscriptions = expenses.filter(e => 
    e.transaction_type === 'cargo' && 
    (e.charge_archetype?.toLowerCase().includes('suscripción') || 
     e.charge_archetype?.toLowerCase().includes('suscripcion') ||
     e.charge_archetype?.toLowerCase().includes('subscription') ||
     e.merchant_category === 'Suscripción streaming' ||
     e.merchant_category === 'Suscripción software' ||
     e.merchant_category === 'Suscripción servicio')
  );
  
  if (subscriptions.length > 0) {
    const subscriptionTotal = subscriptions.reduce((sum, e) => sum + Number(e.amount), 0);
    const monthlySubscriptionCost = subscriptionTotal / (subscriptions.length > 0 ? Math.max(1, subscriptions.length / 2) : 1);
    insights.push({
      type: 'recommendation',
      title: 'Gastos en suscripciones',
      message: `Tienes ${subscriptions.length} transacciones identificadas como suscripciones, con un costo estimado mensual de ${formatCurrency(monthlySubscriptionCost)}. Revisa si todas son necesarias y considera cancelar las que no uses regularmente.`,
      value: formatCurrency(subscriptionTotal),
    });
  }

  // Análisis de categorías sin categorizar
  const otrosCategory = stats.categories_breakdown['Otros'];
  if (otrosCategory && otrosCategory.count >= 5) {
    const otrosPercentage = otrosCategory.percentage;
    insights.push({
      type: 'alert',
      title: 'Transacciones sin categorizar',
      message: `Tienes ${otrosCategory.count} transacciones (${otrosPercentage.toFixed(1)}% del total) en la categoría "Otros". Clasificar estas transacciones te permitirá tener un análisis más preciso de tus gastos y identificar áreas de mejora.`,
    });
  }

  // Análisis de comercios más frecuentados
  const merchantCounts: { [key: string]: number } = {};
  expenses.forEach(e => {
    const merchant = e.merchant_normalized || e.vendor;
    if (merchant) {
      merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;
    }
  });
  
  const topMerchants = Object.entries(merchantCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  if (topMerchants.length > 0 && topMerchants[0][1] >= 5) {
    const topMerchant = topMerchants[0];
    insights.push({
      type: 'summary',
      title: 'Comercio más frecuentado',
      message: `"${topMerchant[0]}" es el comercio donde más realizas transacciones (${topMerchant[1]} veces). Considera si hay oportunidades de ahorro negociando descuentos o buscando alternativas.`,
    });
  }

  // Análisis de gastos variables vs fijos
  if (stats.variable_percentage > 75) {
    insights.push({
      type: 'recommendation',
      title: 'Alta variabilidad en gastos',
      message: `El ${stats.variable_percentage.toFixed(1)}% de tus gastos son variables, lo que dificulta la planificación financiera. Intenta identificar patrones y crear un presupuesto mensual más predecible.`,
    });
  } else if (stats.fixed_percentage > 60) {
    insights.push({
      type: 'summary',
      title: 'Gastos mayormente fijos',
      message: `El ${stats.fixed_percentage.toFixed(1)}% de tus gastos son fijos, lo que facilita la planificación. Asegúrate de tener suficiente flujo de caja para cubrir estos gastos recurrentes.`,
    });
  }

  // Análisis de ticket promedio
  if (stats.average_ticket > 80000) {
    insights.push({
      type: 'recommendation',
      title: 'Ticket promedio alto',
      message: `Tu gasto promedio por transacción es de ${formatCurrency(stats.average_ticket)}, lo cual es significativamente alto. Revisa si hay oportunidades de consolidar compras o negociar mejores precios.`,
    });
  }

  // Análisis de categoría principal
  const topCategory: any = Object.entries(stats.categories_breakdown)
    .filter(([cat]) => cat !== 'Otros')
    .sort(([, a]: any, [, b]: any) => b.amount - a.amount)[0];

  if (topCategory && topCategory[1].percentage > 35) {
    const categoryExpenses = expenses.filter(e => e.category === topCategory[0]);
    const avgCategoryTicket = topCategory[1].amount / topCategory[1].count;
    insights.push({
      type: 'summary',
      title: 'Categoría de mayor gasto',
      message: `"${topCategory[0]}" es tu categoría principal con ${formatCurrency(topCategory[1].amount)} (${topCategory[1].percentage.toFixed(1)}% del total) en ${topCategory[1].count} transacciones. El ticket promedio en esta categoría es de ${formatCurrency(avgCategoryTicket)}.`,
      value: formatCurrency(topCategory[1].amount),
    });
  }

  // Análisis de gasto diario estimado
  const daysWithTransactions = new Set(expenses.map(e => e.date?.substring(0, 10))).size;
  const dailyAverage = daysWithTransactions > 0 ? stats.total_expenses / daysWithTransactions : stats.total_expenses / 30;
  const monthlyProjection = dailyAverage * 30;
  
  insights.push({
    type: 'summary',
    title: 'Proyección de gasto mensual',
    message: `Basado en ${daysWithTransactions} días con transacciones, tu gasto promedio diario es de ${formatCurrency(dailyAverage)}. Esto proyecta un gasto mensual estimado de ${formatCurrency(monthlyProjection)}.`,
    value: formatCurrency(monthlyProjection),
  });

  // Análisis de transacciones sospechosas
  const suspiciousCount = expenses.filter(e => e.is_suspicious).length;
  if (suspiciousCount > 0) {
    insights.push({
      type: 'alert',
      title: 'Transacciones inusuales detectadas',
      message: `Se identificaron ${suspiciousCount} transacción${suspiciousCount > 1 ? 'es' : ''} con patrones inusuales. Revisa estas transacciones para verificar que sean legítimas y no representen fraude o errores.`,
    });
  }

  return insights;
}
