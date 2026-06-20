import React from 'react';
import { WidgetType } from '../types';
import { BarChart3, LineChart, PieChart, Hash, Table, Type } from 'lucide-react';

const WIDGETS: { type: WidgetType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar-chart', label: 'Bar Chart', icon: <BarChart3 size={20} /> },
  { type: 'line-chart', label: 'Line Chart', icon: <LineChart size={20} /> },
  { type: 'pie-chart', label: 'Pie Chart', icon: <PieChart size={20} /> },
  { type: 'kpi-card', label: 'KPI Card', icon: <Hash size={20} /> },
  { type: 'data-table', label: 'Data Table', icon: <Table size={20} /> },
  { type: 'text-box', label: 'Text Box', icon: <Type size={20} /> },
];

export function WidgetToolbar({ onAddWidget }: { onAddWidget: (type: WidgetType) => void }) {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col shrink-0 z-10 shadow-sm relative">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Widgets</h2>
        <p className="text-xs text-gray-500 mt-1">Click to add to dashboard</p>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {WIDGETS.map((widget) => (
          <div
            key={widget.type}
            className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all shadow-sm"
            onClick={() => onAddWidget(widget.type)}
          >
            <div className="text-gray-500 dark:text-gray-400 mr-3">{widget.icon}</div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{widget.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
