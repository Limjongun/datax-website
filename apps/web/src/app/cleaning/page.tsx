"use client"

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { CleanConfig, CleanResponse, MissingValueAction, OutlierMethod, OutlierAction } from './types';
import { Sparkles, Save, Eye, AlertCircle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CleaningPage() {
  const router = useRouter();
  const datasetName = useDatasetStore(state => state.datasetName);
  const columns = useDatasetStore(state => state.columns);
  const rowData = useDatasetStore(state => state.rowData);
  const filePath = useDatasetStore(state => state.filePath);
  const saveChanges = useDatasetStore(state => state.saveChanges);

  const [config, setConfig] = useState<CleanConfig>({
    missing_values: {},
    outliers: {}
  });

  const [activeTab, setActiveTab] = useState<'missing' | 'outliers'>('missing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<CleanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple imputation computation
  const missingStats = useMemo(() => {
    if (!rowData.length) return [];
    return columns.map(col => {
      const count = rowData.filter(row => row[col.field] == null || row[col.field] === '').length;
      return { field: col.field, count };
    }).filter(c => c.count > 0);
  }, [columns, rowData]);

  const numericColumns = useMemo(() => {
    if (!rowData.length) return [];
    return columns.filter(col => {
      const val = rowData.find(row => row[col.field] != null && row[col.field] !== '')?.[col.field];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)));
    });
  }, [columns, rowData]);

  const handleMissingValueChange = (field: string, action: MissingValueAction) => {
    setConfig(prev => {
      const newMv = { ...prev.missing_values };
      if (action === 'ignore') {
        delete newMv[field];
      } else {
        newMv[field] = action;
      }
      return { ...prev, missing_values: newMv };
    });
    setPreviewResult(null); // Reset preview on config change
  };

  const handleOutlierChange = (field: string, key: 'method' | 'action', value: string) => {
    setConfig(prev => {
      const newOutliers = { ...prev.outliers };
      if (!newOutliers[field]) {
        newOutliers[field] = { method: 'iqr', action: 'ignore' };
      }
      
      newOutliers[field] = { ...newOutliers[field], [key]: value };
      
      if (newOutliers[field].action === 'ignore') {
        delete newOutliers[field];
      }
      
      return { ...prev, outliers: newOutliers };
    });
    setPreviewResult(null);
  };

  const runCleaning = async (previewOnly: boolean = true) => {
    setIsProcessing(true);
    setError(null);
    try {
      const payload = { ... (filePath ? { file_path: filePath } : { data: rowData }), config, save_to_disk: !previewOnly };
      
      const response = await fetch('http://localhost:8001/api/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error: ${response.status} - ${errText}`);
      }

      const result: CleanResponse = await response.json();
      if (!result.success) {
        throw new Error("Cleaning failed on the server.");
      }

      setPreviewResult(result);
      
      if (!previewOnly) {
        // Apply changes
        saveChanges(result.data);
        // Navigate back to sheet
        router.push('/sheet');
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!datasetName || rowData.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <Sparkles size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Dataset Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You need to upload a dataset before you can clean it.
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Cleaning</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Configure imputation and outlier handling for: <span className="font-semibold text-slate-700 dark:text-slate-300">{datasetName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => runCleaning(true)} 
            disabled={isProcessing || (Object.keys(config.missing_values).length === 0 && Object.keys(config.outliers).length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing && !previewResult ? 'Processing...' : <><Eye size={16} /> Preview</>}
          </button>
          <button 
            onClick={() => runCleaning(false)}
            disabled={!previewResult || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} /> Apply & Save
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl flex items-start gap-3 border border-rose-100 dark:border-rose-800/50">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium">Cleaning Error</h4>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
        {/* Left Panel: Config */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'missing' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('missing')}
            >
              Missing Values
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'outliers' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('outliers')}
            >
              Outliers
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'missing' && (
              <div className="space-y-4">
                {missingStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                    <CheckCircle2 size={32} className="text-green-500 mb-2" />
                    <h3 className="font-medium text-slate-900 dark:text-white">No Missing Values</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Great! Your dataset doesn't have any missing values.</p>
                  </div>
                ) : (
                  missingStats.map(stat => (
                    <div key={stat.field} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white text-sm">{stat.field}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{stat.count} missing rows</div>
                      </div>
                      <select 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={config.missing_values[stat.field] || 'ignore'}
                        onChange={(e) => handleMissingValueChange(stat.field, e.target.value as MissingValueAction)}
                      >
                        <option value="ignore">Ignore</option>
                        <option value="drop_rows">Drop Rows</option>
                        <option value="drop_column">Drop Column</option>
                        <option value="fill_mean">Fill Mean</option>
                        <option value="fill_median">Fill Median</option>
                        <option value="fill_mode">Fill Mode</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'outliers' && (
              <div className="space-y-4">
                {numericColumns.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No numerical columns found to check for outliers.</div>
                ) : (
                  numericColumns.map(col => {
                    const colConfig = config.outliers[col.field] || { method: 'iqr', action: 'ignore' };
                    return (
                      <div key={col.field} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 space-y-3">
                        <div className="font-medium text-slate-900 dark:text-white text-sm">{col.field}</div>
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={colConfig.method}
                            onChange={(e) => handleOutlierChange(col.field, 'method', e.target.value)}
                          >
                            <option value="iqr">IQR (1.5x)</option>
                            <option value="zscore">Z-Score (&gt;3)</option>
                          </select>
                          <select 
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={colConfig.action}
                            onChange={(e) => handleOutlierChange(col.field, 'action', e.target.value)}
                          >
                            <option value="ignore">Ignore</option>
                            <option value="cap">Cap Values</option>
                            <option value="drop_rows">Drop Rows</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Eye size={18} className="text-slate-500" />
              Cleaning Preview
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!previewResult ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <Info size={32} className="mb-3 text-slate-400" />
                <p>Configure cleaning options and click <br/><strong className="text-slate-700 dark:text-slate-300">Preview</strong> to see the estimated results.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Rows Removed</div>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{previewResult.metrics.rows_removed}</div>
                    <div className="text-xs text-slate-400 mt-1">{previewResult.metrics.initial_rows} &rarr; {previewResult.metrics.final_rows}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Columns Removed</div>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{previewResult.metrics.cols_removed}</div>
                    <div className="text-xs text-slate-400 mt-1">{previewResult.metrics.initial_cols} &rarr; {previewResult.metrics.final_cols}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-3">Action Summary</h3>
                  {previewResult.summary.length === 0 ? (
                    <div className="text-sm text-slate-500">No changes were made.</div>
                  ) : (
                    <ul className="space-y-2">
                      {previewResult.summary.map((msg, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
