"use client"

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { Layers, PlusCircle, Play } from 'lucide-react';
import Link from 'next/link';

export default function CohortPage() {
  const datasetName = useDatasetStore(state => state.datasetName);
  const rowData = useDatasetStore(state => state.rowData);
  const filePath = useDatasetStore(state => state.filePath);
  const { addBlock } = useReportStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [userIdCol, setUserIdCol] = useState('');
  const [dateCol, setDateCol] = useState('');

  // Extract columns from first row
  const columns = rowData.length > 0 ? Object.keys(rowData[0]) : [];

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/stats/cohort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          user_id_col: userIdCol || columns[0],
          date_col: dateCol || columns[1]
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
    addBlock('text', 'Cohort Analysis', 'Generated user retention heatmap.');
    if (result.cohort_matrix) {
       const matrixData = Object.entries(result.cohort_matrix).map(([k, v]: [string, any]) => ({ Cohort: k, ...v }));
       addBlock('data', 'Retention Matrix', matrixData);
    }
    alert("Added to report!");
  };

  if (!datasetName || rowData.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <Layers size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Dataset Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You need to upload a dataset to run Cohort Analysis.
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cohort Analysis & Retention</h1>
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
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Column Mapping</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">User/Customer ID</label>
              <select value={userIdCol} onChange={(e) => setUserIdCol(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select column...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Activity Date</label>
              <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select column...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <button 
              onClick={runAnalysis}
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Processing...' : <><Play size={16} /> Generate Cohort</>}
            </button>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4 mx-auto"></div>
              <p className="text-slate-500">Calculating retention periods...</p>
            </div>
          ) : result ? (
             <div className="flex flex-col h-full w-full">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                   <Layers size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">{result.message}</h3>
                   <p className="text-sm text-slate-500">User Retention by Cohort Month</p>
                 </div>
               </div>

               {result.cohort_matrix && Object.keys(result.cohort_matrix).length > 0 ? (
                 <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                   <table className="w-full text-xs text-center border-collapse">
                     <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                       <tr>
                         <th className="px-3 py-3 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">Cohort</th>
                         {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                           <th key={month} className="px-3 py-3 w-16">Month {month}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                       {Object.entries(result.cohort_matrix).map(([cohort, retention]: [string, any], i: number) => (
                         <tr key={cohort} className="border-t border-slate-200 dark:border-slate-700">
                           <td className="px-3 py-2 font-semibold bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 text-left whitespace-nowrap">
                             {cohort}
                           </td>
                           {Array.from({ length: 12 }, (_, j) => j + 1).map(monthStr => {
                             const val = retention[monthStr.toString()];
                             // Simple color scale for retention
                             let bgClass = "bg-slate-50 dark:bg-slate-900/20";
                             if (val !== null && val !== undefined) {
                               if (val >= 80) bgClass = "bg-blue-500 text-white font-medium";
                               else if (val >= 60) bgClass = "bg-blue-400 text-white";
                               else if (val >= 40) bgClass = "bg-blue-300 text-slate-900";
                               else if (val >= 20) bgClass = "bg-blue-200 text-slate-800";
                               else if (val > 0) bgClass = "bg-blue-100 text-slate-700";
                             }
                             
                             return (
                               <td key={monthStr} className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700/50 ${bgClass}`}>
                                 {val !== null && val !== undefined ? `${val}%` : '-'}
                               </td>
                             );
                           })}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="text-slate-500 text-center py-10">Failed to generate matrix.</div>
               )}
             </div>
          ) : (
            <div className="text-slate-400 text-center">
              <Layers size={48} className="mx-auto mb-4 opacity-50" />
              <p>Map the required columns and click Run to see the results.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
