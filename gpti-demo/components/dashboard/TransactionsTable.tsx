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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      expense.charge_archetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.charge_origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.merchant_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !categoryFilter || expense.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Resetear página cuando cambian los filtros
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  // Calcular paginación
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  const categories = Array.from(new Set(expenses.map((e) => e.category)));

  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

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
          placeholder="Buscar por análisis IA, vendedor o categoría..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
        />
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
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
                  Comercio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                  Tipo Comercio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                  Motivo/Origen
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
            {paginatedExpenses.map((expense) => {
              const isCargo = expense.transaction_type === 'cargo';
              const rowClass = expense.is_suspicious ? "bg-red-50/70" : "";
              return (
                <tr key={expense.id} className={`hover:bg-gray-50 ${rowClass}`}>
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
                    {expense.merchant_normalized || expense.vendor || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {expense.merchant_category ? (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        {expense.merchant_category}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-black max-w-md">
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        {expense.charge_archetype || "Sin análisis"}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {expense.charge_origin || "La IA no entregó más contexto."}
                      </p>
                      {expense.is_suspicious && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            ⚠️ Alerta sospechosa
                          </span>
                          <p className="text-xs text-red-600 mt-1 line-clamp-2">
                            {expense.suspicious_reason || "Movimiento fuera de patrón."}
                          </p>
                        </div>
                      )}
                    </div>
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

      {/* Controles de paginación */}
      {filteredExpenses.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredExpenses.length)} de {filteredExpenses.length} transacciones
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón Anterior */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                
                const pageNum = page as number;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-gray-100 border-gray-300 text-black'
                        : 'border-gray-300 text-black hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Botón Siguiente */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

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
