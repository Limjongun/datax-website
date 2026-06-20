"use client"

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore, ColumnDef } from '@/store/datasetStore';
import { useRouter } from 'next/navigation';

export default function DatasetsPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dbDatasets, setDbDatasets] = useState<any[]>([]);
  const setDataset = useDatasetStore(state => state.setDataset);
  const loadFromHistory = useDatasetStore(state => state.loadFromHistory);
  const history = useDatasetStore(state => state.history);
  const setIsLoading = useDatasetStore(state => state.setIsLoading);
  const isLoading = useDatasetStore(state => state.isLoading);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/datasets')
        .then(res => res.json())
        .then(data => setDbDatasets(data))
        .catch(err => console.error("Failed to fetch datasets", err));
    }
  }, [status]);

  const processData = async (file: File) => {
    if (!session?.user?.id) {
      setError("Anda harus login terlebih dahulu.");
      return;
    }

    try {
      // 1. Upload ke FastAPI
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", session.user.id as string);

      const fastApiResponse = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!fastApiResponse.ok) {
        throw new Error("Gagal mengunggah file ke server pemrosesan.");
      }

      const uploadData = await fastApiResponse.json();

      // 2. Simpan metadata ke Database (Next.js API -> Prisma)
      const dbResponse = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadData.filename,
          filePath: uploadData.file_path,
          rowCount: uploadData.row_count,
          columnCount: uploadData.column_count,
          fileSize: file.size,
        }),
      });

      if (!dbResponse.ok) {
        throw new Error("Gagal menyimpan metadata dataset.");
      }

      const dbData = await dbResponse.json();

      // Setup columns array for the frontend store (for compatibility)
      const columns: ColumnDef[] = uploadData.columns.map((col: string) => ({
        field: col,
        headerName: col,
        type: 'string'
      }));

      // Store basic info in Zustand. We pass preview_data (100 rows) as rowData
      // to avoid browser memory crashes, and let backend read from filePath.
      setDataset(dbData.id, uploadData.filename, columns, uploadData.preview_data || [], uploadData.file_path, uploadData.row_count);
      setSuccess(`Berhasil memuat ${uploadData.row_count.toLocaleString()} baris!`);
      
      setTimeout(() => {
        router.push('/sheet');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };



  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setSuccess(null);
    
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setIsLoading(true);

    processData(file);

  }, [setDataset, setIsLoading, router, session]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Datasets</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Upload and manage your data sources.</p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Upload size={32} />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                {isDragActive ? "Drop the file here" : "Drag & drop a file here, or click to select"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Supports .CSV, .XLSX, and .XLS files
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent mr-3"></div>
            Processing file... This might take a moment for large datasets.
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-3">
            <CheckCircle2 size={20} />
            <span>{success}</span>
          </div>
        )}

        <div className="mt-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Dataset History</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{dbDatasets.length} datasets</span>
          </div>
          
          {dbDatasets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dbDatasets.map((item) => (
                <div 
                  key={item.id}
                  onClick={async () => {
                    // Fetch preview data for the existing dataset to populate the store
                    try {
                      setIsLoading(true);
                      const res = await fetch("http://localhost:8000/api/profile", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ file_path: item.filePath })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        const cols: ColumnDef[] = Object.keys(data.dtypes).map(col => ({ field: col, headerName: col, type: 'string' }));
                        setDataset(item.id, item.name, cols, data.preview?.head || [], item.filePath, item.rowCount);
                        router.push('/sheet');
                      } else {
                        setError("Failed to load dataset details");
                        setIsLoading(false);
                      }
                    } catch (e) {
                      setError("Error loading dataset");
                      setIsLoading(false);
                    }
                  }}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{item.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {item.rowCount.toLocaleString()} rows • {item.columnCount} columns
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Uploaded: {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">No datasets in history yet. Upload a file above to get started.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
