"use client";

import { Expense } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SuspiciousAlertsPanelProps {
  expenses: Expense[];
}

export default function SuspiciousAlertsPanel({
  expenses,
}: SuspiciousAlertsPanelProps) {
  const alerts = expenses
    .filter((expense) => expense.is_suspicious)
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 5);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-black">Alertas de Transacciones</h2>
          <p className="text-sm text-gray-600">
            Movimientos que se salen de tu comportamiento histórico.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
          {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="border border-red-200 rounded-lg p-4 bg-red-50 hover:bg-red-100/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">
                  {formatDate(alert.date)} · {alert.category}
                </p>
                <h3 className="text-base font-semibold text-black mb-2">
                  {alert.vendor || "Comercio desconocido"}
                </h3>
              </div>
              <p
                className={`text-lg font-bold ml-4 ${
                  alert.transaction_type === "cargo"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {formatCurrency(alert.amount)}
              </p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {alert.suspicious_reason || "Movimiento marcado como sospechoso."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

