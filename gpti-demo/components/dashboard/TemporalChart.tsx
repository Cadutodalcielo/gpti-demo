"use client";

import { formatCurrency, formatMonth } from "@/lib/utils";

interface TemporalChartProps {
  data: Array<{
    month: string;
    amount: number;
  }>;
}

export default function TemporalChart({ data }: TemporalChartProps) {

  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <div>
      {data.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-end justify-around h-64 border-b border-gray-200">
            {data.map((item, index) => {
              const heightPercentage = (item.amount / maxAmount) * 100;
              
              return (
                <div
                  key={item.month}
                  className="flex flex-col items-center gap-2 flex-1 mx-1"
                >
                  <div className="text-xs font-semibold text-black">
                    {formatCurrency(item.amount)}
                  </div>
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                    style={{ height: `${heightPercentage}%` }}
                    title={`${formatMonth(item.month)}: ${formatCurrency(item.amount)}`}
                  ></div>
                  <div className="text-xs text-black font-medium">
                    {formatMonth(item.month)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-black">Promedio</div>
              <div className="text-lg font-semibold text-black">
                {formatCurrency(
                  data.reduce((sum, d) => sum + d.amount, 0) / data.length
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-black">Máximo</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(maxAmount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-black">Mínimo</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(Math.min(...data.map((d) => d.amount)))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-black">
          No hay datos de evolución temporal disponibles
        </div>
      )}
    </div>
  );
}
