"use client"

import React, { useState } from 'react';
import { useDatasetStore } from '@/store/datasetStore';
import { ChartConfig } from './types';
import ChartBuilder from './components/ChartBuilder';
import { Plus, Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VisualizationPage() {
  const { activeDatasetId, datasetName } = useDatasetStore();
  const [charts, setCharts] = useState<ChartConfig[]>([]);

  const handleAddChart = () => {
    const newChart: ChartConfig = {
      id: Date.now().toString(),
      type: 'line', // Line & bar prioritized as per user request
      xAxisCol: '',
      yAxisCols: [],
    };
    setCharts([newChart, ...charts]);
  };

  const handleUpdateChart = (updatedConfig: ChartConfig) => {
    setCharts(charts.map(c => c.id === updatedConfig.id ? updatedConfig : c));
  };

  const handleDeleteChart = (id: string) => {
    setCharts(charts.filter(c => c.id !== id));
  };

  if (!activeDatasetId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900 text-slate-300">
        <div className="bg-slate-800 p-6 rounded-full mb-6 text-blue-500">
          <Database size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Tidak Ada Dataset Aktif</h2>
        <p className="text-slate-400 mb-8 max-w-md">
          Anda perlu memilih atau mengunggah dataset terlebih dahulu sebelum dapat membuat visualisasi.
        </p>
        <Link 
          href="/datasets" 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Database size={20} />
          Pilih Dataset
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 h-full bg-slate-900 text-slate-200">
      <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Kembali ke Dashboard">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
                <Database size={24} />
              </span>
              Visualisasi Data
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Dataset aktif: <span className="text-slate-200 font-semibold">{datasetName || 'Unnamed Dataset'}</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleAddChart}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus size={18} />
          Tambah Grafik
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {charts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
            <p className="text-slate-400 mb-4">Belum ada grafik yang dibuat.</p>
            <button
              onClick={handleAddChart}
              className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Buat Grafik Pertama
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {charts.map((chart) => (
              <ChartBuilder
                key={chart.id}
                config={chart}
                onChange={handleUpdateChart}
                onDelete={() => handleDeleteChart(chart.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
