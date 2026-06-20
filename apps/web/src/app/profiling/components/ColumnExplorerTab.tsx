import React, { useState } from 'react';
import { ProfilingData } from '../types';

interface ColumnExplorerTabProps {
  data: ProfilingData;
}

const MetricGroup = ({ title, metrics }: { title: string, metrics: { label: string, value: React.ReactNode }[] }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
    <h4 className="font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">{title}</h4>
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((m, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">{m.label}</span>
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate" title={String(m.value)}>{m.value}</span>
        </div>
      ))}
    </div>
  </div>
);

export function ColumnExplorerTab({ data }: ColumnExplorerTabProps) {
  const columns = Object.keys(data.dtypes);
  const [selectedCol, setSelectedCol] = useState(columns[0]);
  
  if (!selectedCol) return null;

  const dtype = data.dtypes[selectedCol];
  const missing = data.missing_values[selectedCol];
  const uniques = data.unique_counts[selectedCol];
  const valueCounts = data.value_counts[selectedCol] || {};
  const desc = data.describe[selectedCol] || {};
  
  const mode = data.mode?.[selectedCol];
  const variance = data.variance?.[selectedCol];
  const iqrStats = data.iqr_stats?.[selectedCol];
  const outlierPerc = data.outlier_percentage?.[selectedCol];
  const outlierCount = data.outliers?.[selectedCol];
  const shapiro = data.shapiro_wilk?.[selectedCol];
  const trend = data.trend?.[selectedCol];
  const dq = data.data_quality?.[selectedCol];
  const skewness = data.skewness?.[selectedCol];
  const kurtosis = data.kurtosis?.[selectedCol];

  const formatNum = (val: any) => (typeof val === 'number' ? val.toFixed(2) : (val ?? '--'));
  const formatPct = (val: any) => (typeof val === 'number' ? `${val.toFixed(1)}%` : '--');

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[800px]">
      <div className="w-full md:w-64 flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm shrink-0">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300">
          Columns
        </div>
        <div className="flex-1 overflow-y-auto">
          {columns.map(col => (
            <button
              key={col}
              onClick={() => setSelectedCol(col)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 truncate transition-colors
                ${selectedCol === col ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent text-gray-600 dark:text-gray-400'}
              `}
            >
              {col}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCol}</h3>
            <div className="mt-2 inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-mono font-medium border border-blue-200 dark:border-blue-800">
              Type: {dtype}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Rows</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">{data.total_rows.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricGroup 
            title="Basic Details" 
            metrics={[
              { label: 'Missing', value: `${missing?.count || 0} (${formatPct(missing?.percentage)})` },
              { label: 'Unique', value: uniques?.toLocaleString() || '0' },
              { label: 'Count', value: data.total_rows.toLocaleString() },
              { label: 'Data Type', value: dtype }
            ]} 
          />

          <MetricGroup 
            title="Central Tendency" 
            metrics={[
              { label: 'Mean', value: formatNum(desc.mean) },
              { label: 'Median (50%)', value: formatNum(desc['50%']) },
              { label: 'Mode', value: mode ?? '--' }
            ]} 
          />

          <MetricGroup 
            title="Dispersion" 
            metrics={[
              { label: 'Min', value: formatNum(desc.min) },
              { label: 'Max', value: formatNum(desc.max) },
              { label: 'Std Dev', value: formatNum(desc.std) },
              { label: 'Variance', value: formatNum(variance) },
              { label: 'Range', value: (desc.max !== undefined && desc.min !== undefined) ? formatNum(desc.max - desc.min) : '--' },
              { label: 'IQR', value: formatNum(iqrStats?.iqr) }
            ]} 
          />

          <MetricGroup 
            title="Shape & Normality" 
            metrics={[
              { label: 'Skewness', value: formatNum(skewness) },
              { label: 'Kurtosis', value: formatNum(kurtosis) },
              { label: 'Shapiro-Wilk (Stat)', value: formatNum(shapiro?.statistic) },
              { label: 'Shapiro-Wilk (P-val)', value: formatNum(shapiro?.p_value) }
            ]} 
          />

          <MetricGroup 
            title="Outliers (IQR)" 
            metrics={[
              { label: 'Lower Bound', value: formatNum(iqrStats?.lower_bound) },
              { label: 'Upper Bound', value: formatNum(iqrStats?.upper_bound) },
              { label: 'Outlier Count', value: outlierCount ?? '--' },
              { label: 'Outlier %', value: formatPct(outlierPerc) }
            ]} 
          />

          <MetricGroup 
            title="Data Quality" 
            metrics={[
              { label: 'Completeness', value: formatPct(dq?.completeness) },
              { label: 'Uniqueness', value: formatPct(dq?.uniqueness) },
              { label: 'Consistency', value: formatPct(dq?.consistency) },
              { label: 'Validity', value: formatPct(dq?.validity) }
            ]} 
          />
          
          {trend !== undefined && trend !== null && (
            <MetricGroup 
              title="Trend" 
              metrics={[
                { label: 'Linear Slope', value: formatNum(trend) }
              ]} 
            />
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="font-semibold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-gray-200">Common Values Distribution</h4>
          <div className="space-y-4">
            {Object.entries(valueCounts).length > 0 ? (
              Object.entries(valueCounts).map(([val, count]: [string, any]) => (
                <div key={val} className="flex justify-between items-center text-sm">
                  <span className="truncate max-w-[200px] md:max-w-[300px] text-gray-700 dark:text-gray-300 font-medium" title={val}>
                    {val === 'null' ? <span className="italic text-gray-400">Missing (Null)</span> : val}
                  </span>
                  <div className="flex items-center space-x-4 w-1/2 justify-end">
                    <span className="text-gray-600 dark:text-gray-400 text-xs w-16 text-right tabular-nums">{count.toLocaleString()}</span>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((count / data.total_rows) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-500 text-xs w-12 text-right tabular-nums">{((count / data.total_rows) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic py-4 text-center">No common values available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
