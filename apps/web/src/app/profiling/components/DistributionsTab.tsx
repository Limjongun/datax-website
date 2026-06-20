import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ProfilingData } from '../types';

interface DistributionsTabProps {
  data: ProfilingData;
}

export function DistributionsTab({ data }: DistributionsTabProps) {
  const numCols = Object.keys(data.histogram_data || {});
  
  if (numCols.length === 0) {
    return <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">No numerical columns to display distributions.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {numCols.map(col => {
        const hist = data.histogram_data[col];
        if (!hist) return null;
        
        const categories = hist.bins.slice(0, -1).map(b => b.toFixed(2));
        
        const option = {
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          grid: {
            left: '5%',
            right: '5%',
            bottom: '10%',
            top: '10%',
            containLabel: true
          },
          xAxis: [
            {
              type: 'category',
              data: categories,
              axisTick: { alignWithLabel: true },
              axisLabel: { show: true, fontSize: 10, color: '#9ca3af' },
              axisLine: { lineStyle: { color: '#e5e7eb' } }
            }
          ],
          yAxis: [
            { 
              type: 'value',
              splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
              axisLabel: { color: '#9ca3af' }
            }
          ],
          series: [
            {
              name: 'Count',
              type: 'bar',
              barWidth: '95%',
              data: hist.counts,
              itemStyle: { 
                color: '#3b82f6',
                borderRadius: [2, 2, 0, 0]
              }
            }
          ]
        };

        return (
          <div key={col} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.01]">
            <h4 className="font-semibold mb-2 text-center text-gray-800 dark:text-gray-200 truncate" title={col}>{col}</h4>
            <ReactECharts option={option} style={{ height: '220px' }} />
          </div>
        );
      })}
    </div>
  );
}
