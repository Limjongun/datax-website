"use client"

import React from 'react';
import { ChartConfig, ChartType } from '../types';
import { useDatasetStore } from '@/store/datasetStore';
import { Trash2, BarChart, LineChart, ScatterChart, PieChart, Grid, Network } from 'lucide-react';
import ChartRenderer from './ChartRenderer';

interface ChartBuilderProps {
  config: ChartConfig;
  onChange: (newConfig: ChartConfig) => void;
  onDelete: () => void;
}

export default function ChartBuilder({ config, onChange, onDelete }: ChartBuilderProps) {
  const columns = useDatasetStore((state) => state.columns);

  const handleTypeChange = (type: ChartType) => {
    onChange({ ...config, type });
  };

  const handleXAxisToggle = (col: string) => {
    if (config.xAxisCol === col) {
      onChange({ ...config, xAxisCol: '' });
    } else {
      onChange({ ...config, xAxisCol: col });
    }
  };

  const handleYAxisToggle = (col: string) => {
    const newYAxisCols = config.yAxisCols.includes(col)
      ? config.yAxisCols.filter(c => c !== col)
      : [...config.yAxisCols, col];
    onChange({ ...config, yAxisCols: newYAxisCols });
  };

  return (
    <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg h-[500px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          {/* Chart Type Toggles */}
          <div className="flex bg-slate-900 rounded-lg p-1">
            <TypeButton active={config.type === 'bar'} onClick={() => handleTypeChange('bar')} icon={<BarChart size={16} />} label="Bar" />
            <TypeButton active={config.type === 'line'} onClick={() => handleTypeChange('line')} icon={<LineChart size={16} />} label="Line" />
            <TypeButton active={config.type === 'scatter'} onClick={() => handleTypeChange('scatter')} icon={<ScatterChart size={16} />} label="Scatter" />
            <TypeButton active={config.type === 'pie'} onClick={() => handleTypeChange('pie')} icon={<PieChart size={16} />} label="Pie" />
            <TypeButton active={config.type === 'heatmap'} onClick={() => handleTypeChange('heatmap')} icon={<Grid size={16} />} label="Heatmap" />
            <TypeButton active={config.type === 'correlation'} onClick={() => handleTypeChange('correlation')} icon={<Network size={16} />} label="Korelasi" />
          </div>
        </div>
        <button 
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
          title="Remove Chart"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Configuration */}
        <div className="w-64 bg-slate-800/50 border-r border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">X-Axis (Kategori / Waktu)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {columns.map(col => {
                const isChecked = config.xAxisCol === col.field;
                const isDisabled = config.xAxisCol !== '' && !isChecked;
                return (
                  <label key={`x-${col.field}`} className={`flex items-center gap-2 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} group`}>
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => handleXAxisToggle(col.field)}
                      className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-900 disabled:opacity-50"
                    />
                    <span className={`text-sm ${isDisabled ? 'text-slate-500' : 'text-slate-300 group-hover:text-white'} transition-colors truncate`}>
                      {col.headerName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Y-Axis (Nilai)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {columns.map(col => (
                <label key={col.field} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={config.yAxisCols.includes(col.field)}
                    onChange={() => handleYAxisToggle(col.field)}
                    className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-900"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">
                    {col.headerName}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              * Jika kosong, akan menghitung jumlah (Distribusi) dari X-Axis.
            </p>
          </div>
        </div>

        {/* Chart Display */}
        <div className="flex-1 p-4 bg-slate-900/50">
          <ChartRenderer config={config} />
        </div>
      </div>
    </div>
  );
}

function TypeButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
