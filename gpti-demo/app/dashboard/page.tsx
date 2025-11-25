"use client";

import { useState, useEffect } from "react";
import { getDashboardStats, getExpenses } from "@/lib/api";
import { DashboardStats } from "@/types/dashboard";
import { Expense } from "@/types/expense";
import Navigation from "@/components/Navigation";
import KPICards from "@/components/dashboard/KPICards";
import CategoryChart from "@/components/dashboard/CategoryChart";
import TemporalChart from "@/components/dashboard/TemporalChart";
import FixedVariablePanel from "@/components/dashboard/FixedVariablePanel";
import TransactionsTable from "@/components/dashboard/TransactionsTable";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import SuspiciousAlertsPanel from "@/components/dashboard/SuspiciousAlertsPanel";
import ChargeTypeSummary from "@/components/dashboard/ChargeTypeSummary";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, expensesData] = await Promise.all([
        getDashboardStats(selectedMonth || undefined),
        getExpenses()
      ]);
      
      setStats(statsData);
      setExpenses(expensesData);
      
      const months = new Set<string>();
      expensesData.forEach(expense => {
        if (expense.date) {
          const month = expense.date.substring(0, 7);
          months.add(month);
        }
      });
      setAvailableMonths(Array.from(months).sort().reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadData();
  };

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-black font-semibold mb-2">Error</h3>
          <p className="text-black">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-black rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-black">
                Dashboard
              </h1>
              <p className="text-black mt-1">
                Análisis de gastos y transacciones
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Período
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
                >
                  <option value="">Todos los períodos</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {formatMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedMonth && (
                <button
                  onClick={() => setSelectedMonth("")}
                  className="mt-6 px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Ver todos
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && <KPICards stats={stats} />}

        {stats && (
          <div className="mt-6">
            <InsightsPanel stats={stats} expenses={expenses} />
          </div>
        )}

        {expenses.length > 0 && (
          <div className="mt-6">
            <SuspiciousAlertsPanel expenses={expenses} />
          </div>
        )}

        {stats && (
          <div className="mt-6">
            <ChargeTypeSummary stats={stats} expenses={expenses} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {stats && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Gasto por Categoría</h2>
              <CategoryChart data={stats.categories_breakdown} />
            </div>
          )}

          {stats && stats.monthly_evolution && stats.monthly_evolution.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Evolución Temporal</h2>
              <TemporalChart data={stats.monthly_evolution} />
            </div>
          )}
        </div>

        {stats && (
          <div className="mt-6">
            <FixedVariablePanel stats={stats} />
          </div>
        )}

        <div className="mt-6">
          <TransactionsTable 
            expenses={expenses} 
            onRefresh={loadData}
          />
        </div>
      </div>
    </div>
  );
}
