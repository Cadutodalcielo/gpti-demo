"use client";

import { useState } from "react";
import { Expense, EXPENSE_CATEGORIES } from "@/types/expense";
import { updateExpense } from "@/lib/api";

interface EditExpenseModalProps {
  expense: Expense;
  onClose: () => void;
  onSave: () => void;
}

export default function EditExpenseModal({
  expense,
  onClose,
  onSave,
}: EditExpenseModalProps) {
  const [category, setCategory] = useState(expense.category);
  const [isFixed, setIsFixed] = useState(expense.is_fixed || "variable");
  const [transactionType, setTransactionType] = useState<'cargo' | 'abono'>(
    expense.transaction_type || "cargo"
  );
  const [description, setDescription] = useState(expense.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await updateExpense(expense.id, {
        category,
        is_fixed: isFixed,
        transaction_type: transactionType,
        description: description || null,
      });

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-black">
            Editar Transacción
          </h3>
          <button
            onClick={onClose}
            className="text-black hover:text-black"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Tipo de Gasto
            </label>
            <select
              value={isFixed}
              onChange={(e) => setIsFixed(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fixed">Fijo</option>
              <option value="variable">Variable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Tipo de Transacción
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as 'cargo' | 'abono')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cargo">Cargo</option>
              <option value="abono">Abono</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción opcional"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-black rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
