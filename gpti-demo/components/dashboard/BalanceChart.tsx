"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

interface BalanceChartProps {
  data: Array<{
    date: string;
    balance: number;
  }>;
}

export default function BalanceChart({ data }: BalanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-black">
        No hay datos de evolución de saldo disponibles
      </div>
    );
  }

  const normalizedData = data.map((d) => ({
    date: d.date,
    balance: typeof d.balance === 'number' ? d.balance : parseFloat(d.balance) || 0
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const balances = normalizedData.map((d) => d.balance);
  const maxBalance = Math.max(...balances);
  const minBalance = Math.min(...balances);
  const range = maxBalance - minBalance || 1;

  const chartHeight = 300;
  const chartWidth = 100;
  const padding = 40;
  const leftPadding = 50;
  const bottomPadding = 30;

  const chartAreaWidth = chartWidth - leftPadding - padding;
  const chartAreaHeight = chartHeight - bottomPadding - padding;

  const getYPosition = (balance: number) => {
    if (range === 0) return padding + chartAreaHeight / 2;
    const normalized = (balance - minBalance) / range;
    return padding + (1 - normalized) * chartAreaHeight;
  };

  const getXPosition = (index: number) => {
    if (normalizedData.length <= 1) return leftPadding + chartAreaWidth / 2;
    return leftPadding + (index / (normalizedData.length - 1)) * chartAreaWidth;
  };

  // Generar línea simple - solo línea, sin área
  const generateLinePath = () => {
    if (normalizedData.length === 0) return '';
    if (normalizedData.length === 1) {
      const x = getXPosition(0);
      const y = getYPosition(normalizedData[0].balance);
      return `M ${x} ${y}`;
    }

    let path = '';
    for (let i = 0; i < normalizedData.length; i++) {
      const x = getXPosition(i);
      const y = getYPosition(normalizedData[i].balance);
      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    }

    return path;
  };

  const linePath = generateLinePath();

  const currentBalance = normalizedData[normalizedData.length - 1]?.balance || 0;
  const initialBalance = normalizedData[0]?.balance || 0;
  const balanceChange = currentBalance - initialBalance;

  // Calcular posiciones para las etiquetas del eje Y
  const yAxisLabels = [];
  const numYTicks = 5;
  for (let i = 0; i < numYTicks; i++) {
    const value = minBalance + (range * i) / (numYTicks - 1);
    yAxisLabels.push({
      value,
      y: getYPosition(value)
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative" style={{ height: `${chartHeight}px` }}>
        <svg
          width="100%"
          height={chartHeight}
          className="absolute inset-0"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          {/* Grid horizontal */}
          {yAxisLabels.map((label, index) => (
            <line
              key={index}
              x1={leftPadding}
              y1={label.y}
              x2={leftPadding + chartAreaWidth}
              y2={label.y}
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          ))}

          {/* Línea de referencia en cero */}
          {minBalance < 0 && maxBalance > 0 && (
            <line
              x1={leftPadding}
              y1={getYPosition(0)}
              x2={leftPadding + chartAreaWidth}
              y2={getYPosition(0)}
              stroke="#9CA3AF"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* LÍNEA SIMPLE DEL SALDO - SIN ÁREA RELLENA */}
          <path
            d={linePath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Etiquetas de fechas en el eje X - mostrando más fechas */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs text-gray-500" style={{ paddingLeft: `${leftPadding}px`, paddingRight: `${padding}px` }}>
          {normalizedData.length > 0 && (
            <>
              <span className="truncate">{formatDate(normalizedData[0].date)}</span>
              {normalizedData.length > 1 && (
                <span className="truncate">{formatDate(normalizedData[normalizedData.length - 1].date)}</span>
              )}
            </>
          )}
        </div>

        {/* Etiquetas de saldo en el eje Y */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-4 text-xs text-gray-500" style={{ width: `${leftPadding}px` }}>
          {yAxisLabels.map((label, index) => (
            <span 
              key={index} 
              className="text-right pr-2"
              style={{ 
                position: 'absolute',
                top: `${(label.y / chartHeight) * 100}%`,
                transform: 'translateY(-50%)'
              }}
            >
              {formatCurrency(label.value)}
            </span>
          ))}
        </div>
      </div>

      {/* Estadísticas del saldo */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        {/* Saldo Inicial */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo Inicial</div>
          </div>
          <div className={`text-xl font-bold ${initialBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
            {formatCurrency(initialBalance)}
          </div>
        </div>

        {/* Saldo Actual */}
        <div className={`rounded-lg p-3 border-2 ${
          currentBalance >= 0 
            ? 'bg-green-50 border-green-300' 
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${currentBalance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className={`text-xs font-semibold uppercase tracking-wide ${
              currentBalance >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              Saldo Actual
            </div>
          </div>
          <div className={`text-2xl font-extrabold ${
            currentBalance >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {formatCurrency(currentBalance)}
          </div>
        </div>

        {/* Variación */}
        <div className={`rounded-lg p-3 border ${
          balanceChange >= 0 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {balanceChange >= 0 ? (
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <div className={`text-xs font-semibold uppercase tracking-wide ${
              balanceChange >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}>
              Variación
            </div>
          </div>
          <div className={`text-xl font-bold ${
            balanceChange >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange)}
          </div>
        </div>
      </div>
    </div>
  );
}
