"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReportStore } from '@/store/reportStore';
import { Loader2 } from 'lucide-react';

interface DatasetItem {
  id: string;
  name: string;
  filePath: string;
}

interface Props {
  datasets: DatasetItem[];
}

export default function GenerateReportButton({ datasets }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [language, setLanguage] = useState('Indonesian');
  const router = useRouter();
  const clearReport = useReportStore((state) => state.clearReport);
  const addBlock = useReportStore((state) => state.addBlock);

  // Set initial selected dataset if available and not yet set
  useEffect(() => {
    if (datasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  const handleGenerateReport = async () => {
    const dataset = datasets.find(d => d.id === selectedDatasetId);
    if (!dataset) return;
    
    setIsLoading(true);

    try {
      // 1. Get stats by profiling the file path
      const profileRes = await fetch('http://localhost:8000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: dataset.filePath })
      });
      const profileData = await profileRes.json();

      if (!profileData.success) {
        throw new Error(profileData.detail || "Failed to profile dataset");
      }

      // 2. Generate report text from AI
      const aiRes = await fetch('http://localhost:8000/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_name: dataset.name,
          stats: profileData,
          language: language
        })
      });
      const aiData = await aiRes.json();

      if (!aiData.success) {
        throw new Error(aiData.detail || "Failed to generate AI report");
      }

      // 3. Populate report builder
      clearReport();
      
      // Block 1: AI Executive Summary
      addBlock('text', 'Executive Summary', aiData.markdown);

      // Block 2: KPI Table (Rows, Columns, Memory)
      addBlock('data', 'Dataset KPIs', [
        { Metric: "Total Rows", Value: profileData.total_rows },
        { Metric: "Total Columns", Value: profileData.total_columns },
        { Metric: "Memory Usage (MB)", Value: profileData.memory_usage_mb?.toFixed(2) || "N/A" },
        { Metric: "Duplicates", Value: profileData.duplicates }
      ]);

      // Block 3: Alerts
      if (profileData.alerts && profileData.alerts.length > 0) {
        const alertsMarkdown = profileData.alerts.map((a: any) => `- **${a.severity.toUpperCase()}**: ${a.message}`).join('\n');
        addBlock('text', 'Data Quality Alerts', alertsMarkdown);
      }

      // 4. Navigate to report builder
      router.push('/report-builder');
      
    } catch (error: any) {
      console.error(error);
      alert('Error generating report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (datasets.length === 0) {
    return (
      <button disabled className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 py-2 rounded-lg text-sm mt-2 cursor-not-allowed border border-slate-200 dark:border-slate-700">
        No datasets available
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Pilih Dataset</label>
        <select 
          value={selectedDatasetId} 
          onChange={(e) => setSelectedDatasetId(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={isLoading}
        >
          {datasets.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Bahasa Laporan</label>
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={isLoading}
        >
          <option value="Indonesian">Bahasa Indonesia</option>
          <option value="English">English</option>
          <option value="Spanish">Español</option>
          <option value="French">Français</option>
          <option value="Japanese">日本語</option>
          <option value="Korean">한국어</option>
        </select>
      </div>

      <button 
        onClick={handleGenerateReport}
        disabled={isLoading || !selectedDatasetId}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 font-medium py-2 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is analyzing...
          </>
        ) : (
          "Generate full report"
        )}
      </button>
    </div>
  );
}
