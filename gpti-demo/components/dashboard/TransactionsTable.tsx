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
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
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
                <tr 
                  key={expense.id} 
                  className={`hover:bg-gray-50 ${rowClass} cursor-pointer`}
                  onClick={(e) => {
                    // Solo abrir modal si no se clickeó en los botones de acción
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && !target.closest('a')) {
                      setSelectedExpense(expense);
                    }
                  }}
                >
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

      {/* Modal de detalle de transacción */}
      {selectedExpense && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedExpense(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div>
                <h3 className="text-xl font-semibold text-black">
                  Detalle de Transacción
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Información completa de la transacción
                </p>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Fecha
                    </p>
                    <p className="text-base font-semibold text-black">
                      {formatDate(selectedExpense.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Monto
                    </p>
                    <p className={`text-2xl font-bold ${
                      selectedExpense.transaction_type === 'cargo' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(selectedExpense.amount)}
                    </p>
                  </div>
                </div>

                {/* Tipo y categoría */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Tipo de Transacción
                    </p>
                    <span
                      className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${
                        selectedExpense.transaction_type === 'cargo'
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {selectedExpense.transaction_type === 'cargo' ? "CARGO" : "ABONO"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Categoría
                    </p>
                    <span className="inline-block px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedExpense.category}
                    </span>
                  </div>
                </div>

                {/* Comercio */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Comercio
                  </p>
                  <p className="text-base font-semibold text-black">
                    {selectedExpense.merchant_normalized || selectedExpense.vendor || "No especificado"}
                  </p>
                  {selectedExpense.vendor && selectedExpense.merchant_normalized && selectedExpense.vendor !== selectedExpense.merchant_normalized && (
                    <p className="text-xs text-gray-500 mt-1">
                      Original: {selectedExpense.vendor}
                    </p>
                  )}
                </div>

                {/* Tipo de comercio */}
                {selectedExpense.merchant_category && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Tipo de Comercio
                    </p>
                    <span className="inline-block px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {selectedExpense.merchant_category}
                    </span>
                  </div>
                )}

                {/* Análisis de IA */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Análisis de IA
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Tipo de Transacción Detectado:
                      </p>
                      <p className="text-base text-black">
                        {selectedExpense.charge_archetype || "No disponible"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Motivo/Origen:
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedExpense.charge_origin || "La IA no entregó más contexto sobre el origen de esta transacción."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Tipo de Gasto
                    </p>
                    <p className="text-sm text-black">
                      {selectedExpense.is_fixed === "fixed" ? "Fijo" : "Variable"}
                    </p>
                  </div>
                  {selectedExpense.channel && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Canal
                      </p>
                      <p className="text-sm text-black capitalize">
                        {selectedExpense.channel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Descripción original */}
                {selectedExpense.description && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Descripción Original
                    </p>
                    <p className="text-sm text-gray-700">
                      {selectedExpense.description}
                    </p>
                  </div>
                )}

                {/* Alerta sospechosa */}
                {selectedExpense.is_suspicious && (
                  <div className="border-t border-red-200 pt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-red-600 text-xl">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-700 mb-2">
                            Movimiento Sospechoso Detectado
                          </p>
                          <p className="text-sm text-red-600 leading-relaxed">
                            {selectedExpense.suspicious_reason || "Esta transacción fue marcada como sospechosa por el sistema de detección de anomalías."}
                          </p>
                          {selectedExpense.suspicion_score !== null && selectedExpense.suspicion_score !== undefined && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-600 mb-1">
                                Nivel de sospecha: {(selectedExpense.suspicion_score * 100).toFixed(0)}%
                              </p>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-red-600 h-2 rounded-full transition-all"
                                  style={{ width: `${selectedExpense.suspicion_score * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Información del archivo */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Información de Origen
                  </p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Archivo PDF:</span> {selectedExpense.pdf_filename}
                    </p>
                    {selectedExpense.analysis_method && (
                      <p>
                        <span className="font-medium">Método de análisis:</span> {selectedExpense.analysis_method}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedExpense(null);
                    setEditingExpense(selectedExpense);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
