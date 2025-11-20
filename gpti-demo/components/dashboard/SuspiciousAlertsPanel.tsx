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
    <div className="bg-white border border-red-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-red-700">Alertas IA</h2>
          <p className="text-sm text-red-600">
            Movimientos que se salen de tu comportamiento histórico.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="border border-red-100 rounded-lg p-4 bg-red-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {formatDate(alert.date)} · {alert.category}
                </p>
                <h3 className="text-lg font-semibold text-black">
                  {alert.vendor || "Comercio desconocido"}
                </h3>
              </div>
              <p
                className={`text-lg font-bold ${
                  alert.transaction_type === "cargo"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {formatCurrency(alert.amount)}
              </p>
            </div>
            <p className="text-sm text-red-700 mt-2">
              {alert.suspicious_reason || "Movimiento marcado como sospechoso."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

