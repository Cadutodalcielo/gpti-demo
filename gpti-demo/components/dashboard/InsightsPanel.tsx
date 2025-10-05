"use client";

import { DashboardStats } from "@/types/dashboard";
import { Expense } from "@/types/expense";
import { generateInsights, Insight } from "@/lib/utils";

interface InsightsPanelProps {
  stats: DashboardStats;
  expenses: Expense[];
}

export default function InsightsPanel({ stats, expenses }: InsightsPanelProps) {
  const insights = generateInsights(stats, expenses);

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return {
          container: 'bg-red-50 border-red-200',
          icon: '⚠️',
          title: 'text-black',
          message: 'text-black',
        };
      case 'recommendation':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: '💡',
          title: 'text-black',
          message: 'text-black',
        };
      case 'summary':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: '📊',
          title: 'text-black',
          message: 'text-black',
        };
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-black mb-4">
        Análisis y Recomendaciones
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, index) => {
          const styles = getInsightStyles(insight.type);
          return (
            <div
              key={index}
              className={`border rounded-lg p-4 ${styles.container}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{styles.icon}</span>
                <div className="flex-1">
                  <h3 className={`font-semibold text-sm mb-1 ${styles.title}`}>
                    {insight.title}
                  </h3>
                  <p className={`text-sm ${styles.message}`}>
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

