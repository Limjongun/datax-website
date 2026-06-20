"use client"

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChartConfig } from '../types';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { PlusCircle } from 'lucide-react';

interface ChartRendererProps {
  config: ChartConfig;
}

// Harmonious, modern color palette
const COLOR_PALETTE = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

function getPearsonCorrelation(x: number[], y: number[]) {
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export default function ChartRenderer({ config }: ChartRendererProps) {
  const rowData = useDatasetStore((state) => state.rowData);
  const { addBlock } = useReportStore();

  const option = useMemo(() => {
    if (!rowData || rowData.length === 0) return {};
    
    // Base Option definition with Save Toolbox
    const baseOption: any = {
      color: COLOR_PALETTE,
      tooltip: {
        trigger: config.type === 'pie' || config.type === 'heatmap' || config.type === 'correlation' ? 'item' : 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' }
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#cbd5e1' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: 'Simpan',
            name: `chart-${config.type}`,
            backgroundColor: '#0f172a' // slate-900 background to match UI
          }
        },
        iconStyle: {
          borderColor: '#94a3b8'
        }
      }
    };

    if (config.type === 'correlation') {
      // Logic for Correlation Matrix
      const cols = config.yAxisCols.length > 1 ? config.yAxisCols : [...config.yAxisCols];
      if (config.xAxisCol && !cols.includes(config.xAxisCol)) {
        cols.unshift(config.xAxisCol);
      }
      
      if (cols.length < 2) {
        return { ...baseOption, title: { text: 'Pilih minimal 2 kolom (X dan Y) untuk korelasi', textStyle: { color: '#94a3b8', fontSize: 14 }, left: 'center', top: 'center' } };
      }

      const matrixData: any[] = [];
      
      // Extract numerical data
      const colData = cols.map(c => rowData.map(r => Number(r[c])).filter(n => !isNaN(n)));

      for (let i = 0; i < cols.length; i++) {
        for (let j = 0; j < cols.length; j++) {
          const corr = getPearsonCorrelation(colData[i], colData[j]);
          // echarts heatmap data format: [xIndex, yIndex, value]
          matrixData.push([i, j, parseFloat(corr.toFixed(2))]);
        }
      }

      baseOption.xAxis = {
        type: 'category',
        data: cols,
        axisLabel: { color: '#94a3b8', interval: 0, rotate: 30 },
        splitArea: { show: true }
      };
      baseOption.yAxis = {
        type: 'category',
        data: cols,
        axisLabel: { color: '#94a3b8' },
        splitArea: { show: true }
      };
      baseOption.visualMap = {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%',
        inRange: {
          color: ['#ef4444', '#f8fafc', '#3b82f6'] // Red to White to Blue
        },
        textStyle: { color: '#cbd5e1' }
      };
      baseOption.series = [{
        name: 'Pearson Correlation',
        type: 'heatmap',
        data: matrixData,
        label: { show: true, color: '#000' },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }];
      
      return baseOption;
    }

    if (!config.xAxisCol) return {};

    if (config.type === 'heatmap') {
      // Basic Heatmap logic: Count occurrences of (X, Y1) pairs
      const yCol = config.yAxisCols[0];
      if (!yCol) {
        return { ...baseOption, title: { text: 'Pilih 1 kolom Y-Axis untuk Heatmap', textStyle: { color: '#94a3b8', fontSize: 14 }, left: 'center', top: 'center' } };
      }

      const xCategories = Array.from(new Set(rowData.map(r => String(r[config.xAxisCol] || 'Unknown'))));
      const yCategories = Array.from(new Set(rowData.map(r => String(r[yCol] || 'Unknown'))));
      
      const counts = new Map<string, number>();
      rowData.forEach(r => {
        const xVal = String(r[config.xAxisCol] || 'Unknown');
        const yVal = String(r[yCol] || 'Unknown');
        const key = `${xVal}|${yVal}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      const hmData: any[] = [];
      xCategories.forEach((x, i) => {
        yCategories.forEach((y, j) => {
          hmData.push([i, j, counts.get(`${x}|${y}`) || 0]);
        });
      });

      baseOption.xAxis = {
        type: 'category',
        data: xCategories,
        axisLabel: { color: '#94a3b8' },
        splitArea: { show: true }
      };
      baseOption.yAxis = {
        type: 'category',
        data: yCategories,
        axisLabel: { color: '#94a3b8' },
        splitArea: { show: true }
      };
      baseOption.visualMap = {
        min: 0,
        max: Math.max(...Array.from(counts.values()), 1),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%',
        inRange: {
          color: ['#1e293b', '#3b82f6', '#ec4899']
        },
        textStyle: { color: '#cbd5e1' }
      };
      baseOption.series = [{
        name: 'Count',
        type: 'heatmap',
        data: hmData,
        label: { show: true },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }];

      return baseOption;
    }

    // Basic Aggregation: Group by xAxisCol
    // If no yAxisCols are selected, we assume it's a count (distribution)
    const isCount = config.yAxisCols.length === 0;

    const groupedData = new Map<string, any>();

    rowData.forEach((row) => {
      const xValue = String(row[config.xAxisCol] || 'Unknown');
      
      if (!groupedData.has(xValue)) {
        const initVal: any = { count: 0 };
        config.yAxisCols.forEach(yCol => {
          initVal[yCol] = 0;
        });
        groupedData.set(xValue, initVal);
      }

      const current = groupedData.get(xValue);
      current.count += 1;
      
      config.yAxisCols.forEach(yCol => {
        const val = Number(row[yCol]);
        if (!isNaN(val)) {
          current[yCol] += val;
        }
      });
    });

    const xData = Array.from(groupedData.keys());
    const seriesData: any[] = [];

    if (isCount) {
      if (config.type === 'pie') {
        seriesData.push({
          name: 'Count',
          type: 'pie',
          radius: '50%',
          data: xData.map(x => ({ name: x, value: groupedData.get(x).count })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        });
      } else {
        seriesData.push({
          name: 'Count',
          type: config.type === 'scatter' ? 'bar' : config.type,
          data: xData.map(x => groupedData.get(x).count),
          smooth: true,
        });
      }
    } else {
      config.yAxisCols.forEach((yCol, idx) => {
        if (config.type === 'pie') {
           if (idx === 0) {
             seriesData.push({
               name: yCol,
               type: 'pie',
               radius: '50%',
               data: xData.map(x => ({ name: x, value: groupedData.get(x)[yCol] })),
               emphasis: {
                 itemStyle: {
                   shadowBlur: 10,
                   shadowOffsetX: 0,
                   shadowColor: 'rgba(0, 0, 0, 0.5)'
                 }
               }
             });
           }
        } else if (config.type === 'scatter') {
            seriesData.push({
                name: yCol,
                type: 'scatter',
                symbolSize: 10,
                data: xData.map(x => [x, groupedData.get(x)[yCol]])
            });
        } else {
          seriesData.push({
            name: yCol,
            type: config.type,
            data: xData.map(x => groupedData.get(x)[yCol]),
            smooth: true,
          });
        }
      });
    }

    if (config.type !== 'pie') {
      baseOption.xAxis = {
        type: 'category',
        data: xData,
        axisLabel: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#334155' } }
      };
      baseOption.yAxis = {
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } }
      };
    }

    baseOption.series = seriesData;

    return baseOption;

  }, [config, rowData]);

  if (!config.xAxisCol && config.type !== 'correlation') {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Pilih kolom untuk X-Axis agar visualisasi dapat ditampilkan.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
      <div className="absolute top-2 right-12 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => {
            if (Object.keys(option).length > 0) {
              addBlock('chart', `Visualization: ${config.type.toUpperCase()}`, option);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
        >
          <PlusCircle size={14} /> Add to Report
        </button>
      </div>
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }} 
        opts={{ renderer: 'canvas' }} 
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
