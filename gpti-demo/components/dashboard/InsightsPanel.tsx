"use client";

import { DashboardStats } from "@/types/dashboard";
import { Expense } from "@/types/expense";
import { generateInsights, Insight } from "@/lib/utils";

interface InsightsPanelProps {
  stats: DashboardStats;
  expenses: Expense[];
}

// Iconos SVG
const AlertIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const RecommendationIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
  </svg>
);

const SummaryIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

export default function InsightsPanel({ stats, expenses }: InsightsPanelProps) {
  const insights = generateInsights(stats, expenses);

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return {
          container: 'bg-red-50 border-red-200',
          icon: <AlertIcon />,
          iconColor: 'text-red-600',
          title: 'text-black',
          message: 'text-black',
        };
      case 'recommendation':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: <RecommendationIcon />,
          iconColor: 'text-yellow-600',
          title: 'text-black',
          message: 'text-black',
        };
      case 'summary':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: <SummaryIcon />,
          iconColor: 'text-blue-600',
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
              className={`border rounded-lg p-4 ${styles.container} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${styles.iconColor}`}>
                  {styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm mb-1.5 ${styles.title}`}>
                    {insight.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${styles.message}`}>
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

