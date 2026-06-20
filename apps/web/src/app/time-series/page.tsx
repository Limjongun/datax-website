"use client";

import React, { useState } from 'react';
import { useDatasetStore } from '@/store/datasetStore';
import { ArrowLeft, TrendingUp, Calendar, AlertCircle, PlusCircle, Activity, Info } from 'lucide-react';
import { useReportStore } from '@/store/reportStore';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';

export default function TimeSeriesPage() {
  const { activeDatasetId, columns, rowData } = useDatasetStore();
  const { addBlock } = useReportStore();
  
  const [dateColumn, setDateColumn] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [periods, setPeriods] = useState<number>(10);
  const [modelType, setModelType] = useState<string>('arima');
  const [chartType, setChartType] = useState<string>('line');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<'forecast' | 'decompose'>('forecast');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [forecastData, setForecastData] = useState<any>(null);
  const [decomposeData, setDecomposeData] = useState<any>(null);

  const handleForecast = async () => {
    if (!dateColumn || !targetColumn) {
      setError("Pilih kolom tanggal dan kolom target terlebih dahulu.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setActiveTab('forecast');
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/time-series/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: rowData,
          date_column: dateColumn,
          target_column: targetColumn,
          periods,
          model_type: modelType,
          start_date: startDate || undefined,
          end_date: endDate || undefined
        }),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Failed to forecast');
      
      setForecastData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecompose = async () => {
    if (!dateColumn || !targetColumn) {
      setError("Pilih kolom tanggal dan kolom target terlebih dahulu.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setActiveTab('decompose');
    
    // We filter rowData based on start and end date manually or let backend do it.
    // The decompose API doesn't have start_date/end_date yet, so we filter it here for simplicity
    let filteredData = [...rowData];
    if (startDate) filteredData = filteredData.filter(d => new Date(d[dateColumn]) >= new Date(startDate));
    if (endDate) filteredData = filteredData.filter(d => new Date(d[dateColumn]) <= new Date(endDate));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/time-series/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: filteredData,
          date_column: dateColumn,
          target_column: targetColumn,
        }),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Failed to decompose');
      
      setDecomposeData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getChartOptions = () => {
    if (!forecastData) return {};
    
    const { historical, forecast } = forecastData;
    
    let histData: any[] = [];
    let foreData: any[] = [];
    
    if (chartType === 'stock') {
      histData = historical.dates.map((date: string, i: number) => {
        const current = historical.values[i];
        const prev = i > 0 ? historical.values[i - 1] : current;
        return [date, prev, current, Math.min(prev, current), Math.max(prev, current)];
      });
      
      foreData = forecast.dates.map((date: string, i: number) => {
        const current = forecast.values[i];
        const prev = i > 0 ? forecast.values[i - 1] : historical.values[historical.values.length - 1];
        return [date, prev, current, Math.min(prev, current), Math.max(prev, current)];
      });
    } else {
      histData = historical.dates.map((date: string, i: number) => [date, historical.values[i]]);
      foreData = forecast.dates.map((date: string, i: number) => [date, forecast.values[i]]);
      
      if (histData.length > 0 && foreData.length > 0) {
        foreData.unshift(histData[histData.length - 1]);
      }
    }
    
    const lowerData = forecast.dates.map((date: string, i: number) => [date, forecast.lower[i]]);
    const upperData = forecast.dates.map((date: string, i: number) => [date, forecast.upper[i]]);
    
    if (historical.dates.length > 0 && lowerData.length > 0) {
      const lastHistDate = historical.dates[historical.dates.length - 1];
      const lastHistVal = historical.values[historical.values.length - 1];
      lowerData.unshift([lastHistDate, lastHistVal]);
      upperData.unshift([lastHistDate, lastHistVal]);
    }

    const baseSeriesType = chartType === 'area' ? 'line' : (chartType === 'stock' ? 'candlestick' : chartType);
    const baseAreaStyle = chartType === 'area' ? { color: 'rgba(59, 130, 246, 0.2)' } : undefined;
    const forecastAreaStyle = chartType === 'area' ? { color: 'rgba(168, 85, 247, 0.2)' } : undefined;

    const itemStyleStock = chartType === 'stock' ? {
      color: '#10b981',
      color0: '#ef4444',
      borderColor: '#10b981',
      borderColor0: '#ef4444'
    } : { color: '#3b82f6' };
    
    const forecastItemStyleStock = chartType === 'stock' ? {
      color: 'rgba(16, 185, 129, 0.5)',
      color0: 'rgba(239, 68, 68, 0.5)',
      borderColor: '#10b981',
      borderColor0: '#ef4444'
    } : { color: '#a855f7' };

    return {
      title: {
        text: 'Time Series Forecast',
        textStyle: { color: '#e2e8f0' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Historical', 'Forecast', 'Confidence Interval'],
        textStyle: { color: '#94a3b8' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
        scale: true
      },
      series: [
        {
          name: 'Historical',
          type: baseSeriesType,
          data: histData,
          itemStyle: itemStyleStock,
          lineStyle: chartType === 'stock' ? undefined : { width: 2 },
          areaStyle: baseAreaStyle,
          showSymbol: chartType === 'scatter',
          symbolSize: chartType === 'scatter' ? 6 : 4
        },
        {
          name: 'Confidence Interval',
          type: 'line',
          data: upperData,
          lineStyle: { opacity: 0 },
          stack: 'confidence-band',
          symbol: 'none'
        },
        {
          name: 'Confidence Interval',
          type: 'line',
          data: lowerData,
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(168, 85, 247, 0.15)' },
          stack: 'confidence-band',
          symbol: 'none'
        },
        {
          name: 'Forecast',
          type: baseSeriesType,
          data: foreData,
          itemStyle: forecastItemStyleStock,
          lineStyle: chartType === 'stock' ? undefined : { width: 2, type: 'dashed' },
          areaStyle: forecastAreaStyle,
          showSymbol: chartType === 'scatter',
          symbolSize: chartType === 'scatter' ? 6 : 4
        }
      ]
    };
  };

  const getDecomposeOptions = () => {
    if (!decomposeData) return {};
    
    const { dates, observed, trend, seasonal, residual } = decomposeData;
    
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['Observed', 'Trend', 'Seasonal', 'Residual'], textStyle: { color: '#94a3b8' } },
      grid: [
        { top: '5%', height: '18%', left: '5%', right: '5%' },
        { top: '28%', height: '18%', left: '5%', right: '5%' },
        { top: '51%', height: '18%', left: '5%', right: '5%' },
        { top: '74%', height: '18%', left: '5%', right: '5%' }
      ],
      xAxis: [
        { gridIndex: 0, type: 'category', data: dates, show: false },
        { gridIndex: 1, type: 'category', data: dates, show: false },
        { gridIndex: 2, type: 'category', data: dates, show: false },
        { gridIndex: 3, type: 'category', data: dates, axisLabel: { color: '#94a3b8' } }
      ],
      yAxis: [
        { gridIndex: 0, type: 'value', name: 'Observed', nameTextStyle: {color: '#cbd5e1'}, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
        { gridIndex: 1, type: 'value', name: 'Trend', nameTextStyle: {color: '#cbd5e1'}, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
        { gridIndex: 2, type: 'value', name: 'Seasonal', nameTextStyle: {color: '#cbd5e1'}, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } },
        { gridIndex: 3, type: 'value', name: 'Residual', nameTextStyle: {color: '#cbd5e1'}, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#94a3b8' } }
      ],
      series: [
        { name: 'Observed', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: observed, itemStyle: { color: '#3b82f6' }, symbolSize: 2 },
        { name: 'Trend', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: trend, itemStyle: { color: '#f59e0b' }, symbolSize: 2 },
        { name: 'Seasonal', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: seasonal, itemStyle: { color: '#10b981' }, symbolSize: 2 },
        { name: 'Residual', type: 'scatter', xAxisIndex: 3, yAxisIndex: 3, data: residual, itemStyle: { color: '#ef4444' }, symbolSize: 4 }
      ]
    };
  };

  const handleAddToReport = () => {
    if (activeTab === 'forecast' && forecastData) {
      addBlock('chart', `Time Series Forecast: ${targetColumn}`, getChartOptions());
    } else if (activeTab === 'decompose' && decomposeData) {
      addBlock('chart', `Decomposition: ${targetColumn}`, getDecomposeOptions());
    }
  };

  if (!activeDatasetId) {
    return (
      <div className="flex flex-col w-full flex-1 items-center justify-center h-full p-8 bg-slate-900">
        <h2 className="text-xl text-white">Tidak Ada Dataset Aktif</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 h-screen bg-slate-900 text-slate-200">
      <div className="flex items-center p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0 justify-between">
        <div className="flex items-center">
          <Link href="/" className="mr-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="bg-purple-500/10 text-purple-400 p-2 rounded-lg">
                <TrendingUp size={24} />
              </span>
              Time Series Analytics
            </h1>
            <p className="text-sm text-slate-400 mt-1">Forecast masa depan & temukan tren historis.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Config */}
        <div className="w-80 border-r border-slate-800 bg-slate-950 p-6 flex flex-col gap-6 overflow-y-auto">
          
          <div>
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Calendar size={16} /> Kolom Tanggal/Waktu
            </label>
            <select 
              value={dateColumn}
              onChange={(e) => setDateColumn(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
            >
              <option value="">-- Pilih Kolom --</option>
              {columns.map(c => <option key={c.field} value={c.field}>{c.field}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Kolom Target (Metrik)</label>
            <select 
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
            >
              <option value="">-- Pilih Kolom --</option>
              {columns.map(c => <option key={c.field} value={c.field}>{c.field}</option>)}
            </select>
          </div>

          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Filter Range Data (Opsional)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:border-purple-500 outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">Batas historis untuk analisa trend & forecast.</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Model Forecast</label>
            <select 
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
            >
              <option value="arima">ARIMA (Auto-Regressive)</option>
              <option value="hw">Holt-Winters (Exponential Smoothing)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Periode Forecast (ke depan)</label>
            <input 
              type="number" 
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
              min={1}
              max={365}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Tipe Grafik Forecast</label>
            <div className="grid grid-cols-2 gap-2">
              {['line', 'area', 'bar', 'scatter', 'stock'].map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`p-2 text-sm capitalize rounded-lg border transition-colors ${
                    chartType === type 
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleForecast}
              disabled={isLoading}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-purple-500/20"
            >
              {isLoading ? "Proses..." : "Forecast"}
            </button>
            <button
              onClick={handleDecompose}
              disabled={isLoading}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500 text-slate-200 font-medium rounded-lg transition-colors border border-slate-700"
            >
              Decompose
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          
          {/* Top Insights Section (If Forecast Generated) */}
          {activeTab === 'forecast' && forecastData?.insights && (
            <div className="flex gap-4 mb-6 shrink-0">
              <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity size={64} />
                </div>
                <h3 className="text-slate-400 text-sm font-medium mb-1">Overall Trend (Selected Range)</h3>
                <p className={`text-2xl font-bold ${
                  forecastData.insights.overall_trend.includes('Naik') ? 'text-emerald-400' : 
                  forecastData.insights.overall_trend.includes('Turun') ? 'text-red-400' : 'text-slate-200'
                }`}>
                  {forecastData.insights.overall_trend}
                </p>
                <div className="mt-4 flex items-start gap-2 text-sm text-slate-300">
                  <Info size={16} className="mt-0.5 text-blue-400 shrink-0" />
                  <p>Menunjukkan arah keseluruhan dari data target berdasarkan regresi linear.</p>
                </div>
              </div>

              <div className="flex-2 bg-slate-800/50 border border-slate-700 rounded-xl p-5 relative">
                <h3 className="text-slate-400 text-sm font-medium mb-3">Period-over-Period Insights ({forecastData.insights.period_type})</h3>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                  {forecastData.insights.narrative.map((note: string, idx: number) => {
                    const isUp = note.toLowerCase().includes('naik');
                    const isDown = note.toLowerCase().includes('turun');
                    return (
                      <span key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        isUp ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        isDown ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        'bg-slate-700/50 border-slate-600 text-slate-300'
                      }`}>
                        {note}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Chart Area */}
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col min-h-0 relative">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('forecast')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'forecast' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  Forecast
                </button>
                <button 
                  onClick={() => setActiveTab('decompose')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'decompose' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  Decomposition
                </button>
              </div>
              <button 
                onClick={handleAddToReport}
                disabled={!(activeTab === 'forecast' ? forecastData : decomposeData)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:hover:bg-indigo-600/20 disabled:hover:text-indigo-400 rounded-lg transition-colors text-sm"
              >
                <PlusCircle size={16} /> Add to Report
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {activeTab === 'forecast' ? (
                forecastData ? (
                  <ReactECharts 
                    option={getChartOptions()} 
                    style={{ height: '100%', width: '100%' }}
                    theme="dark"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                    <TrendingUp size={48} className="mb-4 opacity-50" />
                    <p>Pilih konfigurasi di panel kiri dan klik "Forecast"</p>
                  </div>
                )
              ) : (
                decomposeData ? (
                  <ReactECharts 
                    option={getDecomposeOptions()} 
                    style={{ height: '100%', width: '100%' }}
                    theme="dark"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                    <Activity size={48} className="mb-4 opacity-50" />
                    <p>Klik "Decompose" untuk membedah Trend, Seasonality, dan Residual</p>
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
