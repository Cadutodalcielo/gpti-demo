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

  const sortedCategories = Object.entries(data).sort(
    ([, a], [, b]) => b.amount - a.amount
  );

  const maxAmount = Math.max(...sortedCategories.map(([, d]) => d.amount));

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

  return (
    <div className="space-y-4">
      {sortedCategories.map(([category, info], index) => {
        const widthPercentage = (info.amount / maxAmount) * 100;
        
        return (
          <div key={category}>
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

      {sortedCategories.length === 0 && (
        <div className="text-center py-8 text-black">
          No hay datos de categorías disponibles
        </div>
      )}
    </div>
  );
}
