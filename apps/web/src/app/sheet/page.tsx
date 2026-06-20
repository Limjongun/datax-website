"use client"

import React, { useMemo, useRef, useCallback, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Plus, Table as TableIcon, Edit3 } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function SheetPage() {
  const gridRef = useRef<AgGridReact>(null);
  const datasetName = useDatasetStore(state => state.datasetName);
  const columns = useDatasetStore(state => state.columns);
  const rowData = useDatasetStore(state => state.rowData);
  const saveChanges = useDatasetStore(state => state.saveChanges);
  const addColumn = useDatasetStore(state => state.addColumn);
  const { theme } = useTheme();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'semi-preview' | 'full-edit'>('semi-preview');

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: true,
      sortable: true,
      resizable: true,
      editable: true,
    };
  }, []);

  const isDark = theme === 'dark';

  const onExportCsv = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.api.exportDataAsCsv({ fileName: `${datasetName || 'export'}.csv` });
    }
  }, [datasetName]);

  const onSaveChanges = useCallback(() => {
    if (gridRef.current) {
      const updatedData: any[] = [];
      gridRef.current.api.forEachNode((node) => {
        updatedData.push(node.data);
      });
      saveChanges(updatedData);
      setSaveStatus("Changes saved successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [saveChanges]);

  const onAddRow = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.api.applyTransaction({ add: [{}] });
    }
  }, []);

  const onAddColumn = useCallback(() => {
    const colName = prompt("Enter new column name:");
    if (colName) {
      addColumn(colName);
    }
  }, [addColumn]);

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Sheet</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 mb-2">
            {datasetName ? `Viewing: ${datasetName} (${rowData.length.toLocaleString()} rows)` : 'No dataset loaded.'}
          </p>
          {columns.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {columns.map((col, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {col.headerName}: <span className="ml-1 text-blue-600 dark:text-blue-400">{col.type || 'string'}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        
        {datasetName && (
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setEditMode('semi-preview')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${editMode === 'semi-preview' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                <TableIcon size={16} /> Semi Preview
              </button>
              <button 
                onClick={() => setEditMode('full-edit')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${editMode === 'full-edit' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                <Edit3 size={16} /> Full Edit
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={onExportCsv} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Export CSV
              </button>
              <button onClick={onSaveChanges} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
                Save Changes
              </button>
            </div>
            {saveStatus && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{saveStatus}</span>}
          </div>
        )}
      </div>

      {editMode === 'full-edit' && datasetName && (
        <div className="mb-4 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
          <span className="text-sm text-blue-800 dark:text-blue-300 font-medium mr-2">Full Edit Tools:</span>
          <button onClick={onAddRow} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-md text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1">
            <Plus size={16} /> Add Row
          </button>
          <button onClick={onAddColumn} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-md text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1">
            <Plus size={16} /> Add Column
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto italic">
            * Note: Excel-like formulas (e.g. =SUM) require HyperFormula integration later.
          </span>
        </div>
      )}

      <div className="h-[calc(100vh-230px)] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        {rowData.length > 0 ? (
          <div className={`h-full w-full ${isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}`}>
            <AgGridReact
              ref={gridRef}
              theme="legacy"
              rowData={rowData}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              pagination={true}
              paginationPageSize={100}
              enableCellTextSelection={true}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Data Available</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
              You haven't loaded any dataset yet. Please go to the Datasets page and upload a CSV or Excel file to get started.
            </p>
            <Link href="/datasets" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Go to Datasets
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
