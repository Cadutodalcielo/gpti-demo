export interface Expense {
  id: number;
  category: string;
  amount: string | number;
  date: string | null;
  vendor: string | null;
  description: string | null;
  pdf_filename: string;
  pdf_path: string;
  analysis_method: string | null;
  is_fixed: string;
  channel: string | null;
  merchant_normalized: string | null;
  merchant_category: string | null;
  transaction_type: 'cargo' | 'abono';
  charge_archetype: string | null;
  charge_origin: string | null;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  suspicion_score: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface ExpenseCreate {
  category: string;
  amount: number;
  date?: string | null;
  vendor?: string | null;
  description?: string | null;
}

export interface ExpenseUpdate {
  category?: string;
  amount?: number;
  date?: string | null;
  vendor?: string | null;
  description?: string | null;
  is_fixed?: string;
  merchant_category?: string | null;
  transaction_type?: 'cargo' | 'abono';
  charge_archetype?: string | null;
  charge_origin?: string | null;
  is_suspicious?: boolean;
  suspicious_reason?: string | null;
}

// Las categorías ahora se obtienen dinámicamente del backend
export type ExpenseCategory = string;
