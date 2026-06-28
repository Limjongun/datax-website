"use client"

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { AlertTriangle, PlusCircle, Play } from 'lucide-react';
import Link from 'next/link';

export default function AnomalyDetectionPage() {
  const datasetName = useDatasetStore(state => state.datasetName);
  const rowData = useDatasetStore(state => state.rowData);
  const filePath = useDatasetStore(state => state.filePath);
  const { addBlock } = useReportStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Extract columns from first row
  const columns = rowData.length > 0 ? Object.keys(rowData[0]) : [];

  const handleColToggle = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8001/api/stats/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          columns: selectedColumns.length > 0 ? selectedColumns : columns.slice(0, 3), // default fallback
          contamination: 0.05
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
    addBlock('text', 'Anomaly Detection', 'Detected outliers using Isolation Forest.');
    if (result.data) addBlock('data', 'Detected Anomalies (Sample)', result.data.slice(0, 10));
    alert("Added to report!");
  };

  if (!datasetName || rowData.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Dataset Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You need to upload a dataset to run Anomaly Detection.
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Anomaly & Outlier Detection</h1>
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
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Features to Analyze</h3>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {columns.map(c => (
                <label key={c} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={selectedColumns.includes(c)}
                    onChange={() => handleColToggle(c)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {c}
                </label>
              ))}
            </div>
            
            <button 
              onClick={runAnalysis}
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Processing...' : <><Play size={16} /> Detect Anomalies</>}
            </button>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4 mx-auto"></div>
              <p className="text-slate-500">Running Isolation Forest...</p>
            </div>
          ) : result ? (
             <div className="flex flex-col h-full w-full">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                   <AlertTriangle size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">{result.message}</h3>
                   <p className="text-sm text-slate-500">Isolation Forest Results</p>
                 </div>
               </div>

               {result.data && result.data.length > 0 ? (
                 <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                   <table className="w-full text-xs text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-700">
                       <tr>
                         {Object.keys(result.data[0] || {}).map(k => (
                           <th key={k} className="px-4 py-3">{k}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                       {result.data.slice(0, 50).map((row: any, i: number) => (
                         <tr key={i} className="hover:bg-red-50 dark:hover:bg-red-900/20">
                           {Object.keys(row).map(k => (
                             <td key={k} className="px-4 py-2 font-mono">
                               {typeof row[k] === 'number' ? row[k].toFixed(2) : String(row[k])}
                             </td>
                           ))}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="text-slate-500 text-center py-10">No anomalies detected within the specified contamination threshold.</div>
               )}
             </div>
          ) : (
            <div className="text-slate-400 text-center">
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select numerical columns and click Run to see the results.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
