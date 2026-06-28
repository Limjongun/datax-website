"use client"

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { Users, AlertCircle, PlusCircle, Play } from 'lucide-react';
import Link from 'next/link';

export default function SegmentationPage() {
  const datasetName = useDatasetStore(state => state.datasetName);
  const rowData = useDatasetStore(state => state.rowData);
  const filePath = useDatasetStore(state => state.filePath);
  const { addBlock } = useReportStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [customerIdCol, setCustomerIdCol] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [amountCol, setAmountCol] = useState('');

  // Extract columns from first row
  const columns = rowData.length > 0 ? Object.keys(rowData[0]) : [];

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8001/api/stats/segmentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          customer_id_col: customerIdCol || columns[0],
          date_col: dateCol || columns[1],
          amount_col: amountCol || columns[2],
          n_clusters: 3
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
    addBlock('text', 'Customer Segmentation Analysis', 'Generated RFM clusters using K-Means.');
    if (result.summary) addBlock('data', 'Cluster Summary', result.summary);
    if (result.data) addBlock('data', 'Sample Customers', result.data.slice(0, 10));
    alert("Added to report!");
  };

  if (!datasetName || rowData.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Dataset Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You need to upload a dataset to run Customer Segmentation.
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Segmentation Studio</h1>
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
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Customer ID Column</label>
              <select value={customerIdCol} onChange={(e) => setCustomerIdCol(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select column...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Transaction Date Column</label>
              <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select column...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Transaction Amount Column</label>
              <select value={amountCol} onChange={(e) => setAmountCol(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select column...</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <button 
              onClick={runAnalysis}
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Processing...' : <><Play size={16} /> Run Segmentation</>}
            </button>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4 mx-auto"></div>
              <p className="text-slate-500">Calculating RFM scores and K-Means clusters...</p>
            </div>
          ) : result ? (
             <div className="flex flex-col h-full w-full">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                   <Users size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">{result.message}</h3>
                   <p className="text-sm text-slate-500">K-Means Clustering Summary</p>
                 </div>
               </div>

               <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-700">
                     <tr>
                       <th className="px-4 py-3">Cluster</th>
                       <th className="px-4 py-3">Customers (Count)</th>
                       <th className="px-4 py-3">Avg Recency (Days)</th>
                       <th className="px-4 py-3">Avg Frequency</th>
                       <th className="px-4 py-3">Avg Monetary</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                     {result.summary && result.summary.map((row: any, i: number) => (
                       <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                         <td className="px-4 py-3 font-semibold">Cluster {row.Cluster}</td>
                         <td className="px-4 py-3">{row.Count}</td>
                         <td className="px-4 py-3">{row.RecencyMean?.toFixed(2)}</td>
                         <td className="px-4 py-3">{row.FrequencyMean?.toFixed(2)}</td>
                         <td className="px-4 py-3">{row.MonetaryMean?.toFixed(2)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {result.data && result.data.length > 0 && (
                 <div className="mt-6">
                   <h4 className="text-sm font-semibold mb-3">Sample Customers</h4>
                   <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                     <table className="w-full text-xs text-left">
                       <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium sticky top-0">
                         <tr>
                           <th className="px-4 py-2">Customer ID</th>
                           <th className="px-4 py-2">Cluster</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {result.data.slice(0, 50).map((row: any, i: number) => (
                           <tr key={i}>
                             <td className="px-4 py-2">{row[customerIdCol || columns[0]]}</td>
                             <td className="px-4 py-2">
                               <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">Cluster {row.Cluster}</span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
             </div>
          ) : (
            <div className="text-slate-400 text-center">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Map the required columns and click Run to see the results.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
