"use client";

import { useState } from "react";
import { Expense } from "@/types/expense";
import { deleteExpense } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import EditExpenseModal from "./EditExpenseModal";

interface TransactionsTableProps {
  expenses: Expense[];
  onRefresh: () => void;
}

export default function TransactionsTable({
  expenses,
  onRefresh,
}: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) return;

    try {
      await deleteExpense(id);
      onRefresh();
    } catch (error) {
      alert("Error al eliminar el gasto");
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !categoryFilter || expense.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(expenses.map((e) => e.category)));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-black">Detalle de Transacciones</h2>
        <div className="text-sm text-black">
          {filteredExpenses.length} de {expenses.length} transacciones
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por descripción, vendedor o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                  Vendedor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                  Descripción
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-black uppercase">
                  Monto
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase">
                  Fijo/Variable
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => {
              const isCargo = expense.transaction_type === 'cargo';
              return (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isCargo
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {isCargo ? "CARGO" : "ABONO"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-black">
                    {expense.vendor || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-black max-w-xs truncate">
                    {expense.description || "Sin descripción"}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-right text-sm font-semibold ${
                    isCargo ? "text-red-600" : "text-green-600"
                  }`}>
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-xs text-black">
                      {expense.is_fixed === "fixed" ? "Fijo" : "Variable"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900 font-medium text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-8 text-black">
            No se encontraron transacciones que coincidan con los filtros
          </div>
        )}
      </div>

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSave={() => {
            setEditingExpense(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
