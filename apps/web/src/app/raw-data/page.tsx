"use client"

import React, { useState, useMemo, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ValueFormatterParams } from 'ag-grid-community';
import { useTheme } from 'next-themes';
import { Settings, Save, ArrowRight, Table } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type FormatType = 'string' | 'numeric' | 'decimal' | 'date' | 'currency';

export default function RawDataProcessPage() {
  const { history, activeDatasetId, loadFromHistory, columns, rowData, saveChanges } = useDatasetStore();
  const [selectedCol, setSelectedCol] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('string');
  const [colFormats, setColFormats] = useState<Record<string, FormatType>>({});
  
  const gridRef = useRef<AgGridReact>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleDatasetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      loadFromHistory(id);
      setColFormats({});
      setSelectedCol('');
    }
  };

  const applyFormat = () => {
    if (!selectedCol) return;
    setColFormats(prev => ({ ...prev, [selectedCol]: selectedFormat }));
  };

  const currencyFormatter = (params: ValueFormatterParams) => {
    if (params.value == null) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(params.value));
  };

  const decimalFormatter = (params: ValueFormatterParams) => {
    if (params.value == null) return '';
    return Number(params.value).toFixed(2);
  };

  const numericFormatter = (params: ValueFormatterParams) => {
    if (params.value == null) return '';
    return parseInt(params.value).toString();
  };

  const dateFormatter = (params: ValueFormatterParams) => {
    if (!params.value) return '';
    try {
      const d = new Date(params.value);
      return d.toLocaleDateString();
    } catch {
      return params.value;
    }
  };

  const gridColumns = useMemo(() => {
    return columns.map(c => {
      const format = colFormats[c.field] || c.type || 'string';
      let valueFormatter = undefined;
      
      if (format === 'currency') valueFormatter = currencyFormatter;
      else if (format === 'decimal') valueFormatter = decimalFormatter;
      else if (format === 'numeric') valueFormatter = numericFormatter;
      else if (format === 'date') valueFormatter = dateFormatter;

      return {
        ...c,
        valueFormatter,
        editable: true,
      };
    });
  }, [columns, colFormats]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
  }), []);

  const onSaveChanges = useCallback(() => {
    if (gridRef.current) {
      const updatedData: any[] = [];
      gridRef.current.api.forEachNode((node) => {
        updatedData.push(node.data);
      });
      saveChanges(updatedData);
      alert("Changes saved to state successfully!");
    }
  }, [saveChanges]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Raw Data Process</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Format column data types and edit spreadsheet directly.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Dataset Selection */}
        <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Dataset to Process</label>
          <select 
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            value={activeDatasetId || ''}
            onChange={handleDatasetSelect}
          >
            <option value="">-- Choose a Dataset --</option>
            {history.map(h => (
              <option key={h.id} value={h.id}>{h.name} ({h.totalRows} rows)</option>
            ))}
          </select>
        </div>

        {/* Format Panel */}
        <div className="flex-2 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30 flex items-end gap-3 shadow-sm">
          <div className="flex-1">
            <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2">Column</label>
            <select 
              className="w-full p-2 border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-900"
              value={selectedCol}
              onChange={e => setSelectedCol(e.target.value)}
            >
              <option value="">-- Choose Column --</option>
              {columns.map(c => (
                <option key={c.field} value={c.field}>{c.headerName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-center text-indigo-300 pb-2">
            <ArrowRight size={20} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2">Format Type</label>
            <select 
              className="w-full p-2 border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-900"
              value={selectedFormat}
              onChange={e => setSelectedFormat(e.target.value as FormatType)}
            >
              <option value="string">String / Text</option>
              <option value="numeric">Numeric (Integer)</option>
              <option value="decimal">Decimal (2.00)</option>
              <option value="currency">Currency ($)</option>
              <option value="date">Date</option>
            </select>
          </div>
          <button 
            onClick={applyFormat}
            disabled={!selectedCol}
            className="h-[42px] px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Settings size={16} /> Apply
          </button>
        </div>
      </div>

      {activeDatasetId ? (
        <div className="flex flex-col h-[calc(100vh-320px)] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Double-click any cell to edit its raw value.
            </span>
            <button 
              onClick={onSaveChanges}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <Save size={16} /> Save Edits
            </button>
          </div>
          <div className={`flex-1 w-full ${isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}`}>
            <AgGridReact
              ref={gridRef}
              theme="legacy"
              rowData={rowData}
              columnDefs={gridColumns}
              defaultColDef={defaultColDef}
              pagination={true}
              paginationPageSize={100}
            />
          </div>
        </div>
      ) : (
        <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <Table size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Data Selected</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md">
            Please select a dataset from the dropdown above to start processing and formatting its columns.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
