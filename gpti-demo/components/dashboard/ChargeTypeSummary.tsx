"use client";

import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";

interface ChargeTypeSummaryProps {
  stats: DashboardStats;
}

const typeLabels: Record<string, { label: string; description: string; color: string; bgColor: string }> = {
  suscripciones: {
    label: "Suscripciones",
    description: "Gastos recurrentes mensuales",
    color: "text-purple-700",
    bgColor: "bg-purple-100"
  },
  compras_diarias: {
    label: "Compras Diarias",
    description: "Gastos cotidianos y esenciales",
    color: "text-blue-700",
    bgColor: "bg-blue-100"
  },
  pagos_excepcionales: {
    label: "Pagos Excepcionales",
    description: "Gastos únicos o de alto monto",
    color: "text-orange-700",
    bgColor: "bg-orange-100"
  },
  otros: {
    label: "Otros",
    description: "Otros tipos de gastos",
    color: "text-gray-700",
    bgColor: "bg-gray-100"
  }
};

export default function ChargeTypeSummary({ stats }: ChargeTypeSummaryProps) {
  const summary = stats.charge_type_summary;
  const totalCharges = stats.total_charges;

  if (!summary || totalCharges === 0) {
    return null;
  }

  const types = Object.entries(summary).filter(([_, data]) => data.count > 0);

  if (types.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-black">
          Resumen por Tipo de Cargo
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Clasificación automática de tus gastos según su naturaleza
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {types.map(([key, data]) => {
          const typeInfo = typeLabels[key] || typeLabels.otros;
          const percentage = totalCharges > 0 ? (data.amount / totalCharges) * 100 : 0;

          return (
            <div
              key={key}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeInfo.bgColor} ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                <span className="text-xs text-gray-500">{data.count} transacciones</span>
              </div>
              
              <p className="text-xs text-gray-600 mb-3">{typeInfo.description}</p>
              
              <div className="mb-2">
                <p className="text-2xl font-bold text-black">
                  {formatCurrency(data.amount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {percentage.toFixed(1)}% del total de cargos
                </p>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full ${typeInfo.bgColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

