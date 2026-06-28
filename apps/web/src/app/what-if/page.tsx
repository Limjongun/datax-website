"use client"

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { Sliders, PlusCircle, Play } from 'lucide-react';
import Link from 'next/link';

export default function WhatIfPage() {
  const datasetName = useDatasetStore(state => state.datasetName);
  const rowData = useDatasetStore(state => state.rowData);
  const filePath = useDatasetStore(state => state.filePath);
  const { addBlock } = useReportStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [targetCol, setTargetCol] = useState('');
  const [featureCol, setFeatureCol] = useState('');
  const [changePercentage, setChangePercentage] = useState<number>(10);

  // Extract columns from first row
  const columns = rowData.length > 0 ? Object.keys(rowData[0]) : [];

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8001/api/stats/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          target_col: targetCol || columns[0],
          feature_col: featureCol || columns[1],
          change_percentage: changePercentage
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Error connecting to backend");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToReport = () => {
    if (!result) return;
    addBlock('text', 'What-If Simulator', `Simulated ${changePercentage}% change on ${featureCol}.`);
    addBlock('data', 'Simulation Results', [
      { Metric: "Baseline Target Avg", Value: result.baseline_target_avg },
      { Metric: "Simulated Target Avg", Value: result.simulated_target_avg },
      { Metric: "Difference", Value: result.difference },
      { Metric: "Difference %", Value: result.difference_percentage + "%" }
    ]);
    alert("Added to report!");
  };

  if (!datasetName || rowData.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <Sliders size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Dataset Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You need to upload a dataset to run the What-If Simulator.
          </p>
          <Link href="/datasets" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Upload Dataset
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">What-If Simulator (Causal Inference)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Dataset: <span className="font-semibold text-slate-700 dark:text-slate-300">{datasetName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleAddToReport}
            disabled={!result || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <PlusCircle size={16} /> Add to Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Scenario Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Target Metric (Y)</label>
              <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select column...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Feature to Change (X)</label>
              <select value={featureCol} onChange={(e) => setFeatureCol(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select column...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Simulate Change (%)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={changePercentage} 
                  onChange={(e) => setChangePercentage(parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm font-medium w-12 text-right">{changePercentage}%</span>
              </div>
            </div>
            
            <button 
              onClick={runAnalysis}
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Processing...' : <><Play size={16} /> Simulate Scenario</>}
            </button>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4 mx-auto"></div>
              <p className="text-slate-500">Estimating causal impact...</p>
            </div>
          ) : result ? (
             <div className="flex flex-col h-full w-full">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                   <Sliders size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">{result.message}</h3>
                   <p className="text-sm text-slate-500">Linear Regression Projection</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Baseline Target Avg</p>
                   <p className="text-3xl font-bold text-slate-900 dark:text-white">{result.baseline_target_avg?.toFixed(2)}</p>
                 </div>
                 <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800/50">
                   <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Simulated Target Avg</p>
                   <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{result.simulated_target_avg?.toFixed(2)}</p>
                 </div>
               </div>

               <div className={`rounded-xl p-6 border ${result.difference > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
                 <p className={`text-sm font-medium mb-1 ${result.difference > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                   Projected Impact on Y
                 </p>
                 <div className="flex items-baseline gap-2">
                   <p className={`text-4xl font-bold ${result.difference > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                     {result.difference > 0 ? '+' : ''}{result.difference?.toFixed(2)}
                   </p>
                   <p className={`text-lg font-medium ${result.difference > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                     ({result.difference_percentage > 0 ? '+' : ''}{result.difference_percentage?.toFixed(2)}%)
                   </p>
                 </div>
               </div>
             </div>
          ) : (
            <div className="text-slate-400 text-center">
              <Sliders size={48} className="mx-auto mb-4 opacity-50" />
              <p>Configure a scenario and click Simulate to see the projection.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
