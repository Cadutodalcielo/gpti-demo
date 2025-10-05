import { Expense, ExpenseUpdate } from "@/types/expense";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadPDF(file: File): Promise<{
  success: boolean;
  message: string;
  count: number;
  pdf_filename: string;
  transactions: any[];
}> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/expenses/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to upload PDF");
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        `No se puede conectar al backend en ${API_BASE_URL}. Asegúrate de que el backend esté corriendo.`
      );
    }
    throw error;
  }
}

export async function getExpenses(category?: string): Promise<Expense[]> {
  const url = new URL(`${API_BASE_URL}/expenses/`);
  if (category) {
    url.searchParams.append("category", category);
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Failed to fetch expenses");
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        `No se puede conectar al backend en ${API_BASE_URL}. Asegúrate de que el backend esté corriendo.`
      );
    }
    throw error;
  }
}

export async function getExpense(id: number): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/expenses/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch expense");
  }

  return response.json();
}

export async function updateExpense(
  id: number,
  data: ExpenseUpdate
): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update expense");
  }

  return response.json();
}

export async function deleteExpense(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete expense");
  }
}

export async function getCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/expenses/categories/list`);

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  const data = await response.json();
  return data.categories;
}

export async function getDashboardStats(month?: string): Promise<any> {
  const url = new URL(`${API_BASE_URL}/expenses/stats`);
  if (month) {
    url.searchParams.append("month", month);
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard stats");
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        `No se puede conectar al backend en ${API_BASE_URL}. Asegúrate de que el backend esté corriendo.`
      );
    }
    throw error;
  }
}
