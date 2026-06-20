import React from 'react';
import { ProfilingData } from '../types';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertsTabProps {
  data: ProfilingData;
}

export function AlertsTab({ data }: AlertsTabProps) {
  if (!data.alerts || data.alerts.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-900 dark:text-white">All Clear!</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">No data quality issues were detected in this dataset.</p>
      </div>
    );
  }

  const sortedAlerts = [...data.alerts].sort((a, b) => {
    const priority = { error: 3, warning: 2, info: 1 };
    return priority[b.severity] - priority[a.severity];
  });

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStyles = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-50/50 border-red-200 text-red-900 dark:bg-red-900/10 dark:border-red-900/50 dark:text-red-200';
      case 'warning': return 'bg-amber-50/50 border-amber-200 text-amber-900 dark:bg-amber-900/10 dark:border-amber-900/50 dark:text-amber-200';
      case 'info': return 'bg-blue-50/50 border-blue-200 text-blue-900 dark:bg-blue-900/10 dark:border-blue-900/50 dark:text-blue-200';
      default: return 'bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {sortedAlerts.map((alert, idx) => (
        <div 
          key={idx} 
          className={`p-4 rounded-xl border flex items-start space-x-4 transition-all hover:shadow-md ${getStyles(alert.severity)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(alert.severity)}
          </div>
          <div className="flex-1">
            <div className="font-semibold capitalize mb-1 flex items-center space-x-2">
              <span>{alert.severity}</span>
            </div>
            <div className="opacity-90">{alert.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
