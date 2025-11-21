"use client";

import { useState, useEffect } from "react";
import { Expense, EXPENSE_CATEGORIES } from "@/types/expense";
import { getExpenses, updateExpense, deleteExpense } from "@/lib/api";

interface ExpensesListProps {
  refreshTrigger: number;
}

export default function ExpensesList({ refreshTrigger }: ExpensesListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Expense>>({});

  useEffect(() => {
    loadExpenses();
  }, [refreshTrigger, selectedCategory]);

  const [error, setError] = useState<string | null>(null);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExpenses(selectedCategory || undefined);
      setExpenses(data);
    } catch (error) {
      console.error("Error loading expenses:", error);
      setError(error instanceof Error ? error.message : "Error al cargar gastos");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditForm({
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      vendor: expense.vendor,
      description: expense.description,
    });
  };

  const handleSave = async (id: number) => {
    try {
      await updateExpense(id, {
        category: editForm.category,
        amount: editForm.amount ? Number(editForm.amount) : undefined,
        date: editForm.date || null,
        vendor: editForm.vendor || null,
        description: editForm.description || null,
      });
      await loadExpenses();
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("Error al actualizar el gasto");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este gasto?")) {
      return;
    }

    try {
      await deleteExpense(id);
      await loadExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Error al eliminar el gasto");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-ES");
  };

  const formatAmount = (amount: string | number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  };

  const totalAmount = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">
                Error de Conexión
              </h3>
              <p className="text-sm text-red-700">{error}</p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-red-600 font-medium">
                  Para solucionar este problema:
                </p>
                <ol className="text-sm text-red-600 list-decimal list-inside space-y-1 ml-2">
                  <li>Ve a la carpeta <code className="bg-red-100 px-1 py-0.5 rounded">backend/</code></li>
                  <li>Crea el archivo <code className="bg-red-100 px-1 py-0.5 rounded">.env</code> con tu API key de OpenAI</li>
                  <li>Ejecuta: <code className="bg-red-100 px-1 py-0.5 rounded">docker-compose up --build</code></li>
                  <li>Espera a que aparezca "Application startup complete"</li>
                  <li>Recarga esta página</li>
                </ol>
              </div>
              <button
                onClick={loadExpenses}
                className="mt-4 px-4 py-2 bg-red-600 text-black rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Reintentar Conexión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-black">
            Filtrar por categoría:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="text-right">
          <p className="text-sm text-black">Total</p>
          <p className="text-2xl font-bold text-black">
            {formatAmount(totalAmount)}
          </p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-black">
            {selectedCategory
              ? "No hay gastos en esta categoría"
              : "No hay gastos registrados. Sube un PDF para comenzar."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => {
                const isSuspicious = expense.is_suspicious;
                return (
                <tr
                  key={expense.id}
                  className={`hover:bg-gray-50 ${
                    isSuspicious ? "bg-red-50/60" : ""
                  }`}
                >
                  {editingId === expense.id ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={editForm.category || expense.category}
                          onChange={(e) =>
                            setEditForm({ ...editForm, category: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.amount || expense.amount}
                          onChange={(e) =>
                            setEditForm({ ...editForm, amount: e.target.value })
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="date"
                          value={editForm.date || expense.date || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, date: e.target.value })
                          }
                          className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.vendor || expense.vendor || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, vendor: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-black">
                        <div>
                          <p className="font-medium">
                            {expense.charge_archetype || "Sin análisis"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {expense.charge_origin || "La IA no entregó detalles."}
                          </p>
                          {expense.is_suspicious && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                Alerta IA
                              </span>
                              <p className="text-xs text-red-600 mt-1">
                                {expense.suspicious_reason || "Movimiento marcado como sospechoso."}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleSave(expense.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-black hover:text-black"
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-black">
                        {formatAmount(expense.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-black">
                        {expense.vendor || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-black">
                        <div>
                          <p className="font-semibold text-black">
                            {expense.charge_archetype || "Sin análisis"}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {expense.charge_origin || "Aún no hay explicación disponible."}
                          </p>
                          {expense.is_suspicious && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                Alerta IA
                              </span>
                              <p className="text-xs text-red-600 mt-1">
                                {expense.suspicious_reason || "Movimiento marcado como sospechoso."}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
