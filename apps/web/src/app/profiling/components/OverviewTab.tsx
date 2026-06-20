import React from 'react';
import { ProfilingData } from '../types';

interface OverviewTabProps {
  data: ProfilingData;
}

export function OverviewTab({ data }: OverviewTabProps) {
  const missingCells = Object.values(data.missing_values).reduce((acc, curr) => acc + curr.count, 0);
  const totalCells = data.total_rows * data.total_columns;
  const missingPercentage = totalCells > 0 ? ((missingCells / totalCells) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Rows</div>
          <div className="text-3xl font-bold">{data.total_rows.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Columns</div>
          <div className="text-3xl font-bold">{data.total_columns}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Missing Cells</div>
          <div className="text-3xl font-bold text-amber-500">{missingPercentage}%</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Duplicates</div>
          <div className="text-3xl font-bold text-red-500">{data.duplicates.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Dataset Preview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                {Object.keys(data.dtypes).map((col) => (
                  <th key={col} className="px-6 py-3 whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                    {col} <span className="text-xs text-gray-400 normal-case ml-1 font-mono">({data.dtypes[col]})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.preview.head.slice(0, 5).map((row, i) => (
                <tr key={i} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {Object.keys(data.dtypes).map((col) => (
                    <td key={col} className="px-6 py-4 whitespace-nowrap max-w-[200px] truncate">
                      {row[col] !== null ? String(row[col]) : <span className="text-gray-400 italic">null</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-500">Showing top 5 rows of {data.total_rows.toLocaleString()}</div>
      </div>
    </div>
  );
}
