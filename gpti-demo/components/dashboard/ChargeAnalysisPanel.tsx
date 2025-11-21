"use client";

import { Expense } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";

interface ChargeAnalysisPanelProps {
  expenses: Expense[];
}

type AggregatedInsight = {
  archetype: string;
  cargoCount: number;
  abonoCount: number;
  cargoTotal: number;
  abonoTotal: number;
  sampleOrigin: string | null;
};

function aggregateByArchetype(expenses: Expense[]): AggregatedInsight[] {
  const map = new Map<string, AggregatedInsight>();

  expenses.forEach((expense) => {
    if (!expense.charge_archetype) {
      return;
    }

    const key = expense.charge_archetype.trim().toLowerCase();
    const existing = map.get(key) || {
      archetype: expense.charge_archetype,
      cargoCount: 0,
      abonoCount: 0,
      cargoTotal: 0,
      abonoTotal: 0,
      sampleOrigin: expense.charge_origin || null,
    };

    if (expense.transaction_type === "cargo") {
      existing.cargoCount += 1;
      existing.cargoTotal += Number(expense.amount);
    } else {
      existing.abonoCount += 1;
      existing.abonoTotal += Number(expense.amount);
    }

    if (!existing.sampleOrigin && expense.charge_origin) {
      existing.sampleOrigin = expense.charge_origin;
    }

    map.set(key, existing);
  });

  return Array.from(map.values());
}

const emptyMessage =
  "La IA aún no tiene suficientes transacciones con análisis disponible.";

export default function ChargeAnalysisPanel({
  expenses,
}: ChargeAnalysisPanelProps) {
  const grouped = aggregateByArchetype(expenses);
  const cargoInsights = grouped
    .filter((item) => item.cargoCount > 0)
    .sort((a, b) => b.cargoTotal - a.cargoTotal)
    .slice(0, 3);
  const abonoInsights = grouped
    .filter((item) => item.abonoCount > 0)
    .sort((a, b) => b.abonoTotal - a.abonoTotal)
    .slice(0, 3);

  if (cargoInsights.length === 0 && abonoInsights.length === 0) {
    return null;
  }

  const renderCard = (insight: AggregatedInsight, type: "cargo" | "abono") => {
    const isCargo = type === "cargo";
    const total = isCargo ? insight.cargoTotal : insight.abonoTotal;
    const count = isCargo ? insight.cargoCount : insight.abonoCount;

    return (
      <div
        key={`${type}-${insight.archetype}`}
        className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              isCargo ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {isCargo ? "CARGO" : "ABONO"}
          </span>
          <span className="text-xs text-black">{count} transacciones</span>
        </div>
        <h3 className="text-lg font-semibold text-black mt-3">
          {insight.archetype}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {insight.sampleOrigin || "La IA no entregó detalles adicionales."}
        </p>
        <div className="mt-3">
          <p className="text-xs text-gray-500">Monto total</p>
          <p
            className={`text-xl font-bold ${
              isCargo ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatCurrency(total)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Análisis IA por tipo de transacción
          </h2>
          <p className="text-sm text-gray-600">
            La IA clasifica los cargos/abonos y explica su origen para ayudarte
            a entenderlos rápidamente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-black mb-2">
            Principales cargos detectados
          </h3>
          {cargoInsights.length === 0 ? (
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          ) : (
            <div className="space-y-3">
              {cargoInsights.map((insight) => renderCard(insight, "cargo"))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-black mb-2">
            Principales abonos detectados
          </h3>
          {abonoInsights.length === 0 ? (
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          ) : (
            <div className="space-y-3">
              {abonoInsights.map((insight) => renderCard(insight, "abono"))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

