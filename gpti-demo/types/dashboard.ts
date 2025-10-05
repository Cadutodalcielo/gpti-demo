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
    amount: number;
  }>;
  top_merchants: Array<{
    merchant: string;
    amount: number;
    count: number;
    avg_ticket: number;
  }>;
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
