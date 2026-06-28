"use client";

import React, { useState } from 'react';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { useRouter } from 'next/navigation';

export default function AiAnalystWidget({ totalDatasets, totalRowsFormatted }: { totalDatasets: number, totalRowsFormatted: string }) {
  const { datasetName, rowData, filePath } = useDatasetStore();
  const { clearReport, addBlock } = useReportStore();
  const router = useRouter();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (rowData.length === 0) {
      setError("Please open a dataset first before generating a report.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // 1. Run profile
      const payload = filePath ? { file_path: filePath } : { data: rowData };
      const profileRes = await fetch('http://localhost:8001/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!profileRes.ok) throw new Error("Failed to profile dataset.");
      const profileData = await profileRes.json();
      
      // 2. Run AI generation
      const aiRes = await fetch('http://localhost:8001/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_name: datasetName,
          stats: profileData
        })
      });
      
      if (!aiRes.ok) throw new Error("Failed to generate AI report.");
      const aiData = await aiRes.json();
      
      // 3. Populate report store
      clearReport();
      
      // Overview stats
      const totalMissing = Object.values(profileData.missing_values || {}).reduce((acc: any, val: any) => acc + val.count, 0);
      const overviewStats = [
        { Metrik: 'Total Baris', Nilai: profileData.total_rows },
        { Metrik: 'Total Kolom', Nilai: profileData.total_columns },
        { Metrik: 'Total Missing Cells', Nilai: totalMissing },
        { Metrik: 'Memory Usage', Nilai: profileData.memory_usage_mb.toFixed(2) + ' MB' }
      ];
      addBlock('data', `Ringkasan: ${datasetName}`, overviewStats);
      
      // AI Narrative
      if (aiData.success) {
        addBlock('text', 'AI Executive Summary', aiData.markdown);
      }
      
      // Alerts
      if (profileData.alerts && profileData.alerts.length > 0) {
        const alertsText = profileData.alerts.map((a: any) => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n');
        addBlock('text', 'Data Quality Alerts', alertsText);
      }
      
      // Navigate to report builder
      router.push('/report-builder');
      
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg border border-blue-100/50 dark:border-blue-800/30">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">System Ready</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          You have uploaded {totalDatasets} datasets containing {totalRowsFormatted} total rows. Head to the profiling tab to let AI analyze them.
        </p>
        {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
      </div>
      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 font-medium py-2 rounded-lg text-sm transition-colors mt-2 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Analyzing...
          </>
        ) : "Generate full report"}
      </button>
    </div>
  );
}
