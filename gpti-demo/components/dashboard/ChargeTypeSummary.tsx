"use client";

import { useState } from "react";
import { DashboardStats } from "@/types/dashboard";
import { Expense } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ChargeTypeSummaryProps {
  stats: DashboardStats;
  expenses: Expense[];
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

export default function ChargeTypeSummary({ stats, expenses }: ChargeTypeSummaryProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const summary = stats.charge_type_summary;
  const totalCharges = stats.total_charges;

  if (!summary || totalCharges === 0) {
    return null;
  }

  const types = Object.entries(summary).filter(([_, data]) => data.count > 0);

  if (types.length === 0) {
    return null;
  }

  // Función para filtrar transacciones por tipo de cargo
  const getFilteredExpenses = (typeKey: string): Expense[] => {
    const filtered: Expense[] = [];
    
    for (const expense of expenses) {
      if (expense.transaction_type !== 'cargo') continue;
      
      const archetypeLower = (expense.charge_archetype || "").toLowerCase();
      const merchantCatLower = (expense.merchant_category || "").toLowerCase();
      const avgTicket = stats.average_ticket;
      
      let matches = false;
      
      if (typeKey === 'suscripciones') {
        matches = ['suscripción', 'suscripcion', 'subscription', 'recurrente', 'mensual'].some(
          keyword => archetypeLower.includes(keyword)
        );
      } else if (typeKey === 'compras_diarias') {
        matches = ['comida', 'restaurante', 'supermercado', 'transporte', 'gasolinera', 'cafetería', 'cafeteria'].some(
          keyword => archetypeLower.includes(keyword) || merchantCatLower.includes(keyword)
        );
      } else if (typeKey === 'pagos_excepcionales') {
        matches = expense.is_fixed === 'fixed' || Number(expense.amount) > (avgTicket * 3);
      } else if (typeKey === 'otros') {
        // Verificar que no pertenezca a ninguna de las otras categorías
        const isSubscription = ['suscripción', 'suscripcion', 'subscription', 'recurrente', 'mensual'].some(
          keyword => archetypeLower.includes(keyword)
        );
        const isDaily = ['comida', 'restaurante', 'supermercado', 'transporte', 'gasolinera', 'cafetería', 'cafeteria'].some(
          keyword => archetypeLower.includes(keyword) || merchantCatLower.includes(keyword)
        );
        const isExceptional = expense.is_fixed === 'fixed' || Number(expense.amount) > (avgTicket * 3);
        matches = !isSubscription && !isDaily && !isExceptional;
      }
      
      if (matches) {
        filtered.push(expense);
      }
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
  };

  const handleCardClick = (typeKey: string) => {
    setSelectedType(typeKey);
  };

  const closeModal = () => {
    setSelectedType(null);
  };

  const selectedExpenses = selectedType ? getFilteredExpenses(selectedType) : [];
  const selectedTypeInfo = selectedType ? typeLabels[selectedType] : null;

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
              onClick={() => handleCardClick(key)}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
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

      {/* Modal de detalles */}
      {selectedType && selectedTypeInfo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div>
                <h3 className="text-xl font-semibold text-black">
                  Detalle: {selectedTypeInfo.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTypeInfo.description}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Resumen */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total</p>
                  <p className="text-2xl font-bold text-black">
                    {formatCurrency(summary[selectedType].amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Transacciones</p>
                  <p className="text-xl font-semibold text-black">
                    {summary[selectedType].count}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Porcentaje</p>
                  <p className="text-xl font-semibold text-black">
                    {((summary[selectedType].amount / totalCharges) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de transacciones */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedExpenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron transacciones para esta categoría.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-semibold text-black">
                              {formatDate(expense.date)}
                            </span>
                            {expense.merchant_category && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedTypeInfo.bgColor} ${selectedTypeInfo.color}`}>
                                {expense.merchant_category}
                              </span>
                            )}
                          </div>
                          
                          <p className="font-semibold text-black mb-1">
                            {expense.charge_archetype || expense.vendor || "Sin descripción"}
                          </p>
                          
                          {expense.charge_origin && (
                            <p className="text-sm text-gray-600 mb-2">
                              {expense.charge_origin}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Vendedor: {expense.vendor || expense.merchant_normalized || "N/A"}</span>
                            {expense.category && (
                              <span>Categoría: {expense.category}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <p className="text-xl font-bold text-red-600">
                            {formatCurrency(expense.amount)}
                          </p>
                          {expense.is_fixed === 'fixed' && (
                            <span className="text-xs text-gray-500">Fijo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

