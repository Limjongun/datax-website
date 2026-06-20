"use client"

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { Download, AlertCircle, BarChart2, LayoutDashboard, Columns, BarChart, Activity, Bell, PlusCircle } from 'lucide-react';
import Link from 'next/link';

// Import our new tab components
import { OverviewTab } from './components/OverviewTab';
import { ColumnExplorerTab } from './components/ColumnExplorerTab';
import { DistributionsTab } from './components/DistributionsTab';
import { CorrelationsTab } from './components/CorrelationsTab';
import { AlertsTab } from './components/AlertsTab';

// Import our new types
import { ProfilingData } from './types';

type TabId = 'overview' | 'columns' | 'distributions' | 'correlations' | 'alerts';

export default function ProfilingPage() {
  const datasetName = useDatasetStore(state => state.datasetName);
  const rowData = useDatasetStore(state => state.rowData);
  const filePath = useDatasetStore(state => state.filePath);
  const { addBlock } = useReportStore();
  
  const [isProfiling, setIsProfiling] = useState(false);
  const [profilingError, setProfilingError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfilingData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    // Only run profiling if we have data and haven't profiled yet
    if (rowData.length > 0 && !profileData && !isProfiling) {
      runProfiling();
    }
  }, [rowData, filePath]);

  const runProfiling = async () => {
    setIsProfiling(true);
    setProfilingError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased timeout to 60s for bigger datasets

      const payload = filePath ? { file_path: filePath } : { data: rowData };

      const response = await fetch('http://localhost:8000/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Server error (${response.status}): ${errorBody || response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setProfileData(result);
      } else {
        throw new Error("Profiling returned unsuccessful result.");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setProfilingError("Request timed out. The dataset may be too large or the backend is unresponsive.");
      } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setProfilingError(
          "Cannot connect to the Python backend (http://localhost:8000). Please ensure the FastAPI server is running: cd apps/api && npm run dev"
        );
      } else {
        setProfilingError(err.message || "An unexpected error occurred during profiling.");
      }
    } finally {
      setIsProfiling(false);
    }
  };

  const handleDownloadReport = () => {
    if (!profileData) return;
    const reportStr = JSON.stringify(profileData, null, 2);
    const blob = new Blob([reportStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetName || 'dataset'}_profiling_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddToReport = () => {
    if (!profileData) return;
    
    const totalMissing = Object.values(profileData.missing_values || {}).reduce((acc, val) => acc + val.count, 0);
    const missingPercentage = profileData.total_rows * profileData.total_columns > 0 
      ? (totalMissing / (profileData.total_rows * profileData.total_columns) * 100).toFixed(2) + '%' 
      : '0%';

    const overviewStats = [
      { Metrik: 'Total Baris', Nilai: profileData.total_rows },
      { Metrik: 'Total Kolom', Nilai: profileData.total_columns },
      { Metrik: 'Total Missing Cells', Nilai: totalMissing },
      { Metrik: 'Missing Percentage', Nilai: missingPercentage },
      { Metrik: 'Duplicate Rows', Nilai: profileData.duplicates },
      { Metrik: 'Total Memory', Nilai: profileData.memory_usage_mb.toFixed(2) + ' MB' },
    ];

    addBlock('data', `1. Ringkasan EDA: ${datasetName}`, overviewStats);

    if (profileData.preview && profileData.preview.head && profileData.preview.head.length > 0) {
      addBlock('data', `2. Data Preview (Head)`, profileData.preview.head);
    }

    const colStats = Object.keys(profileData.dtypes).map(col => {
      const missing = profileData.missing_values[col];
      return {
        Kolom: col,
        Tipe: profileData.dtypes[col],
        Unique: profileData.unique_counts[col] || 0,
        'Missing (n)': missing ? missing.count : 0,
        'Missing (%)': missing ? missing.percentage.toFixed(2) + '%' : '0%'
      };
    });
    addBlock('data', `3. Statistik Kolom`, colStats);

    if (profileData.describe && Object.keys(profileData.describe).length > 0) {
      const distStats = Object.keys(profileData.describe).map(col => {
        const desc = profileData.describe[col];
        return {
          Kolom: col,
          Mean: desc.mean !== undefined ? Number(desc.mean).toFixed(4) : null,
          Std: desc.std !== undefined ? Number(desc.std).toFixed(4) : null,
          Min: desc.min !== undefined ? Number(desc.min).toFixed(4) : null,
          Max: desc.max !== undefined ? Number(desc.max).toFixed(4) : null,
          Skewness: profileData.skewness[col] !== undefined && profileData.skewness[col] !== null ? Number(profileData.skewness[col]).toFixed(4) : null,
          Kurtosis: profileData.kurtosis[col] !== undefined && profileData.kurtosis[col] !== null ? Number(profileData.kurtosis[col]).toFixed(4) : null,
          Outliers: profileData.outliers[col] !== undefined ? profileData.outliers[col] : 0,
        };
      }).filter(stat => stat.Mean !== null && stat.Mean !== "NaN");
      
      if (distStats.length > 0) {
        addBlock('data', `4. Distribusi Data Numerik`, distStats);
      }
    }

    if (profileData.correlation && Object.keys(profileData.correlation).length > 0) {
      const corrData = [];
      for (const [col1, correlations] of Object.entries(profileData.correlation)) {
        const row: any = { Kolom: col1 };
        for (const [col2, val] of Object.entries(correlations)) {
          row[col2] = val !== null ? Number(val).toFixed(4) : null;
        }
        corrData.push(row);
      }
      if (corrData.length > 0) {
        addBlock('data', `5. Korelasi (Pearson)`, corrData);
      }
    }
    
    if (profileData.alerts && profileData.alerts.length > 0) {
      const alertsText = profileData.alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n');
      addBlock('text', '', `6. Peringatan Kualitas Data:\n${alertsText}`);
    }
  };

  if (!datasetName || rowData.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <BarChart2 size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Dataset Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You need to upload a dataset before you can run data profiling.
          </p>
          <Link href="/datasets" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Upload Dataset
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'columns', label: 'Columns', icon: <Columns size={16} /> },
    { id: 'distributions', label: 'Distributions', icon: <BarChart size={16} /> },
    { id: 'correlations', label: 'Correlations', icon: <Activity size={16} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={16} />, badge: profileData?.alerts?.length || 0 },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Profiling</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Deep analysis and exploration for: <span className="font-semibold text-slate-700 dark:text-slate-300">{datasetName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={runProfiling} 
            disabled={isProfiling}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {isProfiling ? 'Running Profiler...' : 'Re-run Profiling'}
          </button>
          <button 
            onClick={handleDownloadReport}
            disabled={!profileData || isProfiling}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download size={16} /> Export JSON
          </button>
          <button 
            onClick={handleAddToReport}
            disabled={!profileData || isProfiling}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <PlusCircle size={16} /> Add to Report
          </button>
        </div>
      </div>

      {profilingError && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl flex items-start gap-3 border border-rose-100 dark:border-rose-800/50">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium">Profiling Error</h4>
            <p className="text-sm mt-1">{profilingError}</p>
          </div>
        </div>
      )}

      {isProfiling && !profileData && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Analyzing dataset...</p>
          <p className="text-slate-400 text-sm mt-2">Computing advanced statistics, distributions, and correlations.</p>
        </div>
      )}

      {profileData && !isProfiling && (
        <div className="flex flex-col h-[calc(100vh-160px)]">
          {/* Tabs Navigation */}
          <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto shrink-0 hide-scrollbar pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`
                  flex items-center space-x-2 py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors
                  ${activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                    ${activeTab === tab.id ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-0 pb-10">
            {activeTab === 'overview' && <OverviewTab data={profileData} />}
            {activeTab === 'columns' && <ColumnExplorerTab data={profileData} />}
            {activeTab === 'distributions' && <DistributionsTab data={profileData} />}
            {activeTab === 'correlations' && <CorrelationsTab data={profileData} />}
            {activeTab === 'alerts' && <AlertsTab data={profileData} />}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
