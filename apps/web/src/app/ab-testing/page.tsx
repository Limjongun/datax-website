"use client";

import React, { useState, useMemo } from 'react';
import { useDatasetStore } from '@/store/datasetStore';
import { Database, ArrowLeft, FlaskConical, Play, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { useReportStore } from '@/store/reportStore';

export default function ABTestingPage() {
  const { activeDatasetId, datasetName, columns, rowData } = useDatasetStore();
  const { addBlock } = useReportStore();
  
  const [metricCol, setMetricCol] = useState<string>('');
  const [groupCol, setGroupCol] = useState<string>('');
  const [controlGroup, setControlGroup] = useState<string>('');
  const [treatmentGroup, setTreatmentGroup] = useState<string>('');
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter columns based on inferred types
  const numericColumns = useMemo(() => {
    return columns.filter(col => {
      // In a real app we might rely on col.type, but we can also infer by checking the first few rows
      const firstVal = rowData.find(r => r[col.field] !== null && r[col.field] !== undefined)?.[col.field];
      return typeof firstVal === 'number' || !isNaN(Number(firstVal));
    });
  }, [columns, rowData]);

  const categoricalColumns = useMemo(() => {
    return columns.filter(col => {
      const firstVal = rowData.find(r => r[col.field] !== null && r[col.field] !== undefined)?.[col.field];
      return typeof firstVal === 'string' || typeof firstVal === 'boolean';
    });
  }, [columns, rowData]);

  // Extract unique values for the selected group column to populate group dropdowns
  const groupValues = useMemo(() => {
    if (!groupCol || rowData.length === 0) return [];
    const vals = new Set(rowData.map(r => String(r[groupCol])));
    return Array.from(vals).filter(Boolean); // remove empty strings
  }, [groupCol, rowData]);

  // Auto-select first unique values if available
  React.useEffect(() => {
    if (groupValues.length >= 2) {
      if (!controlGroup || !groupValues.includes(controlGroup)) setControlGroup(groupValues[0]);
      if (!treatmentGroup || !groupValues.includes(treatmentGroup)) setTreatmentGroup(groupValues[1]);
    }
  }, [groupValues, controlGroup, treatmentGroup]);

  const handleRunTest = async () => {
    if (!activeDatasetId || !metricCol || !groupCol || !controlGroup || !treatmentGroup) return;
    
    setIsExecuting(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/stats/ab-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: rowData,
          metric_column: metricCol,
          group_column: groupCol,
          control_group: controlGroup,
          treatment_group: treatmentGroup
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Gagal menjalankan A/B Test');
      }
      
      if (data.success) {
        setResult(data);
      } else {
        throw new Error('A/B Test gagal');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses data');
    } finally {
      setIsExecuting(false);
    }
  };

  const getChartOption = () => {
    if (!result || !metricCol) return {};
    
    // Create boxplot data approximation for visualization
    // ECharts requires raw data for exact boxplot, but we'll show a simple bar chart of means
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: [controlGroup + ' (Control)', treatmentGroup + ' (Treatment)'],
        axisLabel: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'value',
        name: 'Rata-rata ' + metricCol,
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155' } }
      },
      series: [
        {
          name: 'Mean',
          type: 'bar',
          barWidth: '40%',
          data: [
            {
              value: result.control_mean,
              itemStyle: { color: '#64748b' } // Slate for control
            },
            {
              value: result.treatment_mean,
              itemStyle: { 
                color: result.is_significant && result.difference_percentage > 0 ? '#10b981' : // Green if better
                       result.is_significant && result.difference_percentage < 0 ? '#ef4444' : // Red if worse
                       '#3b82f6' // Blue if not significant
              } 
            }
          ],
          label: {
            show: true,
            position: 'top',
            formatter: '{c}',
            color: '#cbd5e1'
          }
        }
      ]
    };
  };

  const handleAddToReport = () => {
    if (result) {
      const textContent = `**A/B Testing: ${metricCol}**\nControl: ${controlGroup}\nTreatment: ${treatmentGroup}\nP-Value: ${result.p_value}\nSignificance: ${result.is_significant ? 'Yes' : 'No'}\nConclusion: ${result.conclusion}`;
      addBlock('text', 'A/B Test Results', textContent);
      addBlock('chart', 'A/B Test Comparison', getChartOption());
    }
  };

  if (!activeDatasetId) {
    return (
      <div className="flex flex-col w-full flex-1 items-center justify-center h-full p-8 text-center bg-slate-900 text-slate-300">
        <div className="bg-slate-800 p-6 rounded-full mb-6 text-blue-500">
          <Database size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Tidak Ada Dataset Aktif</h2>
        <p className="text-slate-400 mb-8 max-w-md">
          Anda perlu memilih atau mengunggah dataset terlebih dahulu sebelum dapat menggunakan A/B Testing Module.
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
    <div className="flex flex-col w-full flex-1 h-full bg-slate-900 text-slate-200 overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Kembali ke Dashboard">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="bg-teal-500/10 text-teal-400 p-2 rounded-lg">
                <FlaskConical size={24} />
              </span>
              A/B Testing & Statistik
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Uji signifikansi statistik (T-Test) pada dataset <span className="text-slate-200 font-semibold">{datasetName || 'Unnamed Dataset'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel - Config */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Konfigurasi Uji</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Metrik Uji (Numerik)</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={metricCol}
                  onChange={(e) => setMetricCol(e.target.value)}
                >
                  <option value="">-- Pilih Metrik --</option>
                  {numericColumns.map(col => (
                    <option key={col.field} value={col.field}>{col.headerName}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Variabel terikat yang ingin diukur (mis. revenue, conversion_rate).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Kolom Grup (Kategorik)</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={groupCol}
                  onChange={(e) => setGroupCol(e.target.value)}
                >
                  <option value="">-- Pilih Kolom Grup --</option>
                  {categoricalColumns.map(col => (
                    <option key={col.field} value={col.field}>{col.headerName}</option>
                  ))}
                </select>
              </div>

              {groupCol && groupValues.length > 0 && (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Grup A (Control)</label>
                    <select 
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                      value={controlGroup}
                      onChange={(e) => setControlGroup(e.target.value)}
                    >
                      <option value="">-- Pilih Grup Control --</option>
                      {groupValues.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Grup B (Treatment)</label>
                    <select 
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                      value={treatmentGroup}
                      onChange={(e) => setTreatmentGroup(e.target.value)}
                    >
                      <option value="">-- Pilih Grup Treatment --</option>
                      {groupValues.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={handleRunTest}
                disabled={isExecuting || !metricCol || !groupCol || !controlGroup || !treatmentGroup || controlGroup === treatmentGroup}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium rounded-lg transition-colors shadow-lg shadow-teal-500/20 mt-4"
              >
                {isExecuting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play size={18} className="fill-current" />
                )}
                Jalankan Uji A/B
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          {result && !isExecuting && !error && (
            <div className="flex justify-end mb-4">
              <button 
                onClick={handleAddToReport}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors text-sm"
              >
                <PlusCircle size={16} /> Add to Report
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-400 mb-6">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Terjadi Kesalahan</h4>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {!result && !error && !isExecuting && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20 p-8 text-center">
              <div className="bg-slate-800 p-4 rounded-full mb-4 text-slate-400">
                <FlaskConical size={32} />
              </div>
              <h3 className="text-xl font-medium text-slate-300 mb-2">Siap untuk Pengujian</h3>
              <p className="text-slate-500 max-w-sm text-sm">
                Pilih metrik dan grup di panel sebelah kiri, lalu klik 'Jalankan Uji A/B' untuk melihat tingkat signifikansi statistik.
              </p>
            </div>
          )}

          {isExecuting && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-slate-700 rounded-xl bg-slate-800/50 p-8">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-300">Menghitung statistik...</p>
            </div>
          )}

          {result && !isExecuting && (
            <div className="flex flex-col gap-6">
              {/* Conclusion Badge */}
              <div className={`p-6 rounded-xl border flex items-start gap-4 ${
                result.is_significant 
                  ? result.difference_percentage > 0 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-slate-800 border-slate-700'
              }`}>
                {result.is_significant ? (
                  result.difference_percentage > 0 ? (
                    <CheckCircle2 size={32} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle size={32} className="text-rose-500 shrink-0" />
                  )
                ) : (
                  <Minus size={32} className="text-slate-400 shrink-0" />
                )}
                
                <div>
                  <h3 className={`text-xl font-bold mb-1 ${
                    result.is_significant 
                      ? result.difference_percentage > 0 ? 'text-emerald-400' : 'text-rose-400'
                      : 'text-slate-300'
                  }`}>
                    {result.is_significant ? 'SIGNIFICANT DIFFERENCE' : 'NO SIGNIFICANT DIFFERENCE'}
                  </h3>
                  <p className="text-slate-300">{result.conclusion}</p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <p className="text-slate-400 text-sm font-medium mb-1">P-Value</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{result.p_value < 0.0001 ? '< 0.0001' : result.p_value.toFixed(4)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Batas signifikansi: 0.05
                  </p>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <p className="text-slate-400 text-sm font-medium mb-1">T-Statistic</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{result.t_statistic.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Nilai absolut {">"} 1.96 mengindikasikan signifikansi.
                  </p>
                </div>

                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <p className="text-slate-400 text-sm font-medium mb-1">Delta / Uplift</p>
                  <div className="flex items-end gap-2">
                    <span className={`text-3xl font-bold ${result.difference_percentage > 0 ? 'text-emerald-400' : result.difference_percentage < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {result.difference_percentage > 0 ? '+' : ''}{result.difference_percentage.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    {result.difference_percentage > 0 ? <TrendingUp size={12} className="text-emerald-400"/> : result.difference_percentage < 0 ? <TrendingDown size={12} className="text-rose-400"/> : <Minus size={12}/>}
                    Perbedaan dari kontrol
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-lg font-medium text-white mb-4">Perbandingan Rata-rata</h3>
                <div className="h-64 w-full">
                  <ReactECharts 
                    option={getChartOption()} 
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </div>
              
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
