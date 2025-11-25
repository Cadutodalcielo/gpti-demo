export interface DashboardStats {
  total_expenses: number;
  total_transactions: number;
  average_ticket: number;
  fixed_percentage: number;
  variable_percentage: number;
  total_charges: number;
  total_deposits: number;
  net_flow: number;
  categories_breakdown: {
    [key: string]: {
      amount: number;
      count: number;
      percentage: number;
    };
  };
  monthly_evolution: Array<{
    month: string;
    charges: number;
    deposits: number;
  }>;
  balance_evolution: Array<{
    date: string;
    balance: number;
  }>;
  top_merchants: Array<{
    merchant: string;
    amount: number;
    count: number;
    avg_ticket: number;
  }>;
  charge_type_summary: {
    suscripciones: { amount: number; count: number };
    compras_diarias: { amount: number; count: number };
    pagos_excepcionales: { amount: number; count: number };
    otros: { amount: number; count: number };
  };
}

export interface ExpenseFull {
  id: number;
  category: string;
  amount: number;
  date: string | null;
  vendor: string | null;
  description: string | null;
  is_fixed: string;
  channel: string | null;
  merchant_normalized: string | null;
  pdf_filename: string;
  analysis_method: string | null;
  created_at: string;
}

export interface DashboardFilters {
  month: string | null;
  category: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  search: string;
}
