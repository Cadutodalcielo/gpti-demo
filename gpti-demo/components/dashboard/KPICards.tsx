"use client";

import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";

interface KPICardsProps {
  stats: DashboardStats;
}

export default function KPICards({ stats }: KPICardsProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
        <div className="text-sm font-medium text-black mb-1">
          TOTAL CARGOS
        </div>
        <div className="text-2xl font-bold text-red-600">
          {formatCurrency(stats.total_charges)}
        </div>
        <div className="mt-2 text-xs text-black">
          Gastos y pagos
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="text-sm font-medium text-black mb-1">
          TOTAL ABONOS
        </div>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(stats.total_deposits)}
        </div>
        <div className="mt-2 text-xs text-black">
          Ingresos y depósitos
        </div>
      </div>

      <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${
        stats.net_flow >= 0 ? 'border-blue-500' : 'border-orange-500'
      }`}>
        <div className="text-sm font-medium text-black mb-1">
          FLUJO NETO
        </div>
        <div className={`text-2xl font-bold ${
          stats.net_flow >= 0 ? 'text-blue-600' : 'text-orange-600'
        }`}>
          {formatCurrency(stats.net_flow)}
        </div>
        <div className="mt-2 text-xs text-black">
          {stats.net_flow >= 0 ? 'Balance positivo' : 'Balance negativo'}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm font-medium text-black mb-1">
          TRANSACCIONES
        </div>
        <div className="text-2xl font-bold text-black">
          {stats.total_transactions}
        </div>
        <div className="mt-2 text-xs text-black">
          Total del período
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm font-medium text-black mb-1">
          TICKET MEDIO
        </div>
        <div className="text-2xl font-bold text-black">
          {formatCurrency(stats.average_ticket)}
        </div>
        <div className="mt-2 text-xs text-black">
          Promedio por transacción
        </div>
      </div>
    </div>
  );
}
