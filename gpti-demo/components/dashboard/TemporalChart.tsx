"use client";

import { formatCurrency, formatMonth } from "@/lib/utils";

interface TemporalChartProps {
  data: Array<{
    month: string;
    charges: number;
    deposits: number;
  }>;
}

export default function TemporalChart({ data }: TemporalChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-black">
        No hay datos de evolución temporal disponibles
      </div>
    );
  }

  const normalizedData = data.map((d) => ({
    month: d.month,
    charges: typeof d.charges === 'number' ? d.charges : parseFloat(d.charges) || 0,
    deposits: typeof d.deposits === 'number' ? d.deposits : parseFloat(d.deposits) || 0
  }));
  
  const allAmounts = [
    ...normalizedData.map((d) => d.charges),
    ...normalizedData.map((d) => d.deposits)
  ].filter(amount => !isNaN(amount) && isFinite(amount) && amount > 0);
  
  const maxAmount = allAmounts.length > 0 ? Math.max(...allAmounts) : 0;
  const totalCharges = normalizedData.reduce((sum, d) => sum + d.charges, 0);
  const totalDeposits = normalizedData.reduce((sum, d) => sum + d.deposits, 0);
  const netFlow = totalDeposits - totalCharges;

  const chartHeight = 256; // h-64 = 256px
  const barAreaHeight = chartHeight - 60; // Espacio para labels y meses

  return (
    <div>
      <div className="space-y-4">
        <div className="relative border-b border-gray-200 pb-4" style={{ height: `${chartHeight}px` }}>
          {/* Contenedor de barras alineadas al fondo */}
          <div className="absolute bottom-12 left-0 right-0 flex items-end justify-around gap-2" style={{ height: `${barAreaHeight}px` }}>
            {normalizedData.map((item, index) => {
              const chargesHeightPx = maxAmount > 0 ? (item.charges / maxAmount) * barAreaHeight : 0;
              const depositsHeightPx = maxAmount > 0 ? (item.deposits / maxAmount) * barAreaHeight : 0;
              const minChargesHeight = chargesHeightPx > 0 && chargesHeightPx < 8 ? 8 : chargesHeightPx;
              const minDepositsHeight = depositsHeightPx > 0 && depositsHeightPx < 8 ? 8 : depositsHeightPx;
                
              return (
                <div
                  key={item.month}
                  className="flex gap-1 flex-1 h-full items-end"
                >
                  {/* Barra de cargos (roja) */}
                  <div className="flex flex-col items-center justify-end flex-1 h-full">
                    {item.charges > 0 && (
                      <div className="text-xs font-semibold text-red-600 mb-1 whitespace-nowrap">
                        {formatCurrency(item.charges)}
                      </div>
                    )}
                    <div
                      className="w-full bg-red-500 rounded-t hover:bg-red-600 transition-colors cursor-pointer"
                      style={{ 
                        height: `${minChargesHeight}px`,
                        minHeight: item.charges > 0 ? '8px' : '0'
                      }}
                      title={`Cargos ${formatMonth(item.month)}: ${formatCurrency(item.charges)}`}
                    ></div>
                  </div>
                  
                  {/* Barra de abonos (verde) */}
                  <div className="flex flex-col items-center justify-end flex-1 h-full">
                    {item.deposits > 0 && (
                      <div className="text-xs font-semibold text-green-600 mb-1 whitespace-nowrap">
                        {formatCurrency(item.deposits)}
                      </div>
                    )}
                    <div
                      className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                      style={{ 
                        height: `${minDepositsHeight}px`,
                        minHeight: item.deposits > 0 ? '8px' : '0'
                      }}
                      title={`Abonos ${formatMonth(item.month)}: ${formatCurrency(item.deposits)}`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Etiquetas de meses alineadas en la parte inferior */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around gap-2">
            {normalizedData.map((item) => (
              <div key={item.month} className="flex-1 text-center">
                <div className="text-xs text-black font-medium">
                  {formatMonth(item.month)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs text-black">Cargos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs text-black">Abonos</span>
          </div>
        </div>

        <div className="pt-4 border-t">
          {/* Totales de Cargos y Abonos - diseño compacto */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total Cargos</div>
              <div className="text-base font-semibold text-red-600">
                {formatCurrency(totalCharges)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Total Abonos</div>
              <div className="text-base font-semibold text-green-600">
                {formatCurrency(totalDeposits)}
              </div>
            </div>
          </div>

          {/* Flujo Neto - componente destacado */}
          <div className={`rounded-lg p-4 shadow-md ${
            netFlow >= 0 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border border-green-300' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border border-red-300'
          }`}>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {netFlow >= 0 ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Flujo Neto</div>
              </div>
              <div className={`text-2xl font-bold mb-1.5 ${
                netFlow >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
              </div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                netFlow >= 0 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-red-200 text-red-800'
              }`}>
                {netFlow >= 0 ? (
                  <>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Balance positivo
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Balance negativo
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
