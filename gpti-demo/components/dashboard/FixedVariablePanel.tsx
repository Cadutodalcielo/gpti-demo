"use client";

import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";

interface FixedVariablePanelProps {
  stats: DashboardStats;
}

export default function FixedVariablePanel({ stats }: FixedVariablePanelProps) {

  const fixedAmount =
    (stats.total_expenses * stats.fixed_percentage) / 100;
  const variableAmount =
    (stats.total_expenses * stats.variable_percentage) / 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6 text-black">Fijo vs Variable</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="text-sm font-medium text-black mb-1">
            GASTOS FIJOS
          </div>
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {formatCurrency(fixedAmount)}
          </div>
          <div className="text-sm text-black">
            {stats.fixed_percentage.toFixed(1)}% del total
          </div>
          <div className="mt-3 text-xs text-black">
            Suscripciones, arriendos, servicios recurrentes
          </div>
        </div>

        <div className="border-l-4 border-green-500 pl-4">
          <div className="text-sm font-medium text-black mb-1">
            GASTOS VARIABLES
          </div>
          <div className="text-2xl font-bold text-green-600 mb-2">
            {formatCurrency(variableAmount)}
          </div>
          <div className="text-sm text-black">
            {stats.variable_percentage.toFixed(1)}% del total
          </div>
          <div className="mt-3 text-xs text-black">
            Compras ocasionales, entretenimiento, varios
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex h-8 rounded-lg overflow-hidden">
          <div
            className="bg-blue-500 flex items-center justify-center text-black text-sm font-medium"
            style={{ width: `${stats.fixed_percentage}%` }}
          >
            {stats.fixed_percentage > 10 && `${stats.fixed_percentage.toFixed(0)}%`}
          </div>
          <div
            className="bg-green-500 flex items-center justify-center text-black text-sm font-medium"
            style={{ width: `${stats.variable_percentage}%` }}
          >
            {stats.variable_percentage > 10 && `${stats.variable_percentage.toFixed(0)}%`}
          </div>
        </div>
      </div>
    </div>
  );
}
