import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ProfilingData } from '../types';

interface CorrelationsTabProps {
  data: ProfilingData;
}

export function CorrelationsTab({ data }: CorrelationsTabProps) {
  const corrData = data.correlation || {};
  const columns = Object.keys(corrData);

  const option = useMemo(() => {
    if (columns.length === 0) return null;

    const heatmapData = [];
    for (let i = 0; i < columns.length; i++) {
      for (let j = 0; j < columns.length; j++) {
        const val = corrData[columns[i]][columns[j]];
        heatmapData.push([i, j, val !== null ? val.toFixed(2) : '-']);
      }
    }

    return {
      tooltip: { 
        position: 'top',
        formatter: (params: any) => {
          return `${columns[params.data[0]]} & ${columns[params.data[1]]}: <b>${params.data[2]}</b>`;
        }
      },
      grid: { height: '70%', top: '5%', bottom: '20%' },
      xAxis: {
        type: 'category',
        data: columns,
        splitArea: { show: true },
        axisLabel: { interval: 0, rotate: 45, color: '#6b7280' },
        axisLine: { lineStyle: { color: '#e5e7eb' } }
      },
      yAxis: {
        type: 'category',
        data: columns,
        splitArea: { show: true },
        axisLabel: { color: '#6b7280' },
        axisLine: { lineStyle: { color: '#e5e7eb' } }
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#ef4444', '#f9fafb', '#3b82f6'] // Red to White to Blue
        },
        textStyle: { color: '#6b7280' }
      },
      series: [{
        name: 'Pearson Correlation',
        type: 'heatmap',
        data: heatmapData,
        label: { 
          show: true,
          color: '#374151'
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 1
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' }
        }
      }]
    };
  }, [columns, corrData]);

  if (!option) {
    return <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">Not enough numerical data for correlation matrix.</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-200">Pearson Correlation Matrix</h3>
      <ReactECharts option={option} style={{ height: '600px' }} />
    </div>
  );
}
