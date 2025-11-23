"use client";

import { formatCurrency } from "@/lib/utils";

interface CategoryChartProps {
  data: {
    [key: string]: {
      amount: number;
      count: number;
      percentage: number;
    };
  };
}

export default function CategoryChart({ data }: CategoryChartProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center py-8 text-black">
        No hay datos de categorías disponibles
      </div>
    );
  }

  const sortedCategories = Object.entries(data)
    .map(([cat, info]) => [cat, {
      amount: typeof info.amount === 'number' ? info.amount : parseFloat(info.amount as any) || 0,
      count: typeof info.count === 'number' ? info.count : parseInt(info.count as any) || 0,
      percentage: typeof info.percentage === 'number' ? info.percentage : parseFloat(info.percentage as any) || 0
    }] as [string, { amount: number; count: number; percentage: number }])
    .sort(([, a], [, b]) => b.amount - a.amount);

  const amounts = sortedCategories.map(([, d]) => d.amount).filter(amount => !isNaN(amount) && isFinite(amount) && amount > 0);
  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-orange-500",
  ];

  // Calcular altura aproximada: cada categoría ~68px (título + barra + espaciado)
  // 7 categorías = ~476px, con padding total ~520px
  const maxHeight = 520;

  return (
    <div className="max-h-[520px] overflow-y-auto pr-2 space-y-4">
      {sortedCategories.map(([category, info], index) => {
        const widthPercentage = maxAmount > 0 ? (info.amount / maxAmount) * 100 : 0;

        return (
          <div key={category} className="flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-black">
                {category}
              </span>
              <span className="text-sm font-semibold text-black">
                {formatCurrency(info.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                <div
                  className={`h-full ${colors[index % colors.length]} transition-all duration-500 flex items-center px-3`}
                  style={{ width: `${widthPercentage}%` }}
                >
                  <span className="text-xs font-medium text-black">
                    {info.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="text-xs text-black w-12 text-right">
                {info.count} txs
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
