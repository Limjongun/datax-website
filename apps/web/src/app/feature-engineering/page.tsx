"use client"

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import {
  FeatureEngineeringConfig,
  FeatureEngineeringResponse,
  EncodingMethod,
  ScalingMethod,
  TransformationMethod
} from './types';
import { Sparkles, Save, Eye, AlertCircle, CheckCircle2, Info, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FeatureEngineeringPage() {
  const router = useRouter();
  const datasetName = useDatasetStore(state => state.datasetName);
  const columns = useDatasetStore(state => state.columns);
  const rowData = useDatasetStore(state => state.rowData);
  const filePath = useDatasetStore(state => state.filePath);
  const saveChanges = useDatasetStore(state => state.saveChanges);

  const [config, setConfig] = useState<FeatureEngineeringConfig>({
    encoding: [],
    scaling: [],
    transformation: [],
    creation: []
  });

  const [activeTab, setActiveTab] = useState<'encoding' | 'scaling' | 'transformation' | 'creation'>('encoding');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<FeatureEngineeringResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoricalColumns = useMemo(() => {
    if (!rowData.length) return [];
    return columns.filter(col => {
      const val = rowData.find(row => row[col.field] != null && row[col.field] !== '')?.[col.field];
      return typeof val === 'string' && isNaN(Number(val));
    });
  }, [columns, rowData]);

  const numericColumns = useMemo(() => {
    if (!rowData.length) return [];
    return columns.filter(col => {
      const val = rowData.find(row => row[col.field] != null && row[col.field] !== '')?.[col.field];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)));
    });
  }, [columns, rowData]);

  const handleEncodingChange = (field: string, method: EncodingMethod | 'ignore', dropOriginal: boolean = false) => {
    setConfig(prev => {
      let newEncoding = [...prev.encoding].filter(e => e.column !== field);
      if (method !== 'ignore') {
        newEncoding.push({ column: field, method, drop_original: dropOriginal });
      }
      return { ...prev, encoding: newEncoding };
    });
    setPreviewResult(null);
  };

  const handleScalingChange = (field: string, method: ScalingMethod | 'ignore', dropOriginal: boolean = false) => {
    setConfig(prev => {
      let newScaling = [...prev.scaling].filter(s => s.column !== field);
      if (method !== 'ignore') {
        newScaling.push({ column: field, method, drop_original: dropOriginal });
      }
      return { ...prev, scaling: newScaling };
    });
    setPreviewResult(null);
  };

  const handleTransformationChange = (field: string, method: TransformationMethod | 'ignore', dropOriginal: boolean = false, bins: number = 5) => {
    setConfig(prev => {
      let newTrans = [...prev.transformation].filter(t => t.column !== field);
      if (method !== 'ignore') {
        newTrans.push({ column: field, method, bins, drop_original: dropOriginal });
      }
      return { ...prev, transformation: newTrans };
    });
    setPreviewResult(null);
  };

  const addCreationConfig = () => {
    setConfig(prev => ({
      ...prev,
      creation: [...prev.creation, { new_column: '', formula: '' }]
    }));
    setPreviewResult(null);
  };

  const updateCreationConfig = (index: number, key: 'new_column' | 'formula', value: string) => {
    setConfig(prev => {
      const newCreation = [...prev.creation];
      newCreation[index] = { ...newCreation[index], [key]: value };
      return { ...prev, creation: newCreation };
    });
    setPreviewResult(null);
  };

  const removeCreationConfig = (index: number) => {
    setConfig(prev => {
      const newCreation = [...prev.creation];
      newCreation.splice(index, 1);
      return { ...prev, creation: newCreation };
    });
    setPreviewResult(null);
  };

  const hasAnyConfig = () => {
    return config.encoding.length > 0 || 
           config.scaling.length > 0 || 
           config.transformation.length > 0 || 
           config.creation.filter(c => c.new_column && c.formula).length > 0;
  };

  const runEngineering = async (previewOnly: boolean = true) => {
    setIsProcessing(true);
    setError(null);
    try {
      const payload = { ... (filePath ? { file_path: filePath } : { data: rowData }), config, save_to_disk: !previewOnly };

      const response = await fetch('http://localhost:8000/api/feature-engineering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error: ${response.status} - ${errText}`);
      }

      const result: FeatureEngineeringResponse = await response.json();
      if (!result.success) {
        throw new Error("Feature Engineering failed on the server.");
      }

      setPreviewResult(result);
      
      if (!previewOnly) {
        saveChanges(result.data);
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
            You need to upload a dataset before applying feature engineering.
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feature Engineering</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Transform and create features for: <span className="font-semibold text-slate-700 dark:text-slate-300">{datasetName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => runEngineering(true)} 
            disabled={isProcessing || !hasAnyConfig()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing && !previewResult ? 'Processing...' : <><Eye size={16} /> Preview</>}
          </button>
          <button 
            onClick={() => runEngineering(false)}
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
            <h4 className="font-medium">Engineering Error</h4>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
        {/* Left Panel: Config */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            {(['encoding', 'scaling', 'transformation', 'creation'] as const).map((tab) => (
              <button 
                key={tab}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'encoding' && (
              <div className="space-y-4">
                {categoricalColumns.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No categorical columns found for encoding.</div>
                ) : (
                  categoricalColumns.map(col => {
                    const enc = config.encoding.find(e => e.column === col.field);
                    return (
                      <div key={col.field} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="font-medium text-slate-900 dark:text-white text-sm">{col.field}</div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={enc?.drop_original || false}
                              onChange={(e) => handleEncodingChange(col.field, enc?.method || 'ignore', e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Drop Original
                          </label>
                          <select 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
                            value={enc?.method || 'ignore'}
                            onChange={(e) => handleEncodingChange(col.field, e.target.value as any, enc?.drop_original)}
                          >
                            <option value="ignore">Ignore</option>
                            <option value="onehot">One-Hot</option>
                            <option value="label">Label</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'scaling' && (
              <div className="space-y-4">
                {numericColumns.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No numerical columns found for scaling.</div>
                ) : (
                  numericColumns.map(col => {
                    const sc = config.scaling.find(s => s.column === col.field);
                    return (
                      <div key={col.field} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="font-medium text-slate-900 dark:text-white text-sm">{col.field}</div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={sc?.drop_original || false}
                              onChange={(e) => handleScalingChange(col.field, sc?.method || 'ignore', e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Drop Original
                          </label>
                          <select 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
                            value={sc?.method || 'ignore'}
                            onChange={(e) => handleScalingChange(col.field, e.target.value as any, sc?.drop_original)}
                          >
                            <option value="ignore">Ignore</option>
                            <option value="standard">Standard</option>
                            <option value="minmax">MinMax</option>
                            <option value="robust">Robust</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'transformation' && (
              <div className="space-y-4">
                {numericColumns.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No numerical columns found for transformation.</div>
                ) : (
                  numericColumns.map(col => {
                    const trans = config.transformation.find(t => t.column === col.field);
                    return (
                      <div key={col.field} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-slate-900 dark:text-white text-sm">{col.field}</div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={trans?.drop_original || false}
                                onChange={(e) => handleTransformationChange(col.field, trans?.method || 'ignore', e.target.checked, trans?.bins)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              Drop Original
                            </label>
                            <select 
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
                              value={trans?.method || 'ignore'}
                              onChange={(e) => handleTransformationChange(col.field, e.target.value as any, trans?.drop_original, trans?.bins)}
                            >
                              <option value="ignore">Ignore</option>
                              <option value="log">Log</option>
                              <option value="sqrt">Square Root</option>
                              <option value="binning_equal_width">Binning</option>
                            </select>
                          </div>
                        </div>
                        {trans?.method === 'binning_equal_width' && (
                          <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="text-slate-500">Bins:</span>
                            <input 
                              type="number" 
                              min="2" max="100"
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 w-16 outline-none"
                              value={trans.bins || 5}
                              onChange={(e) => handleTransformationChange(col.field, 'binning_equal_width', trans.drop_original, parseInt(e.target.value))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'creation' && (
              <div className="space-y-4">
                {config.creation.map((cr, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        placeholder="New Column Name" 
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                        value={cr.new_column}
                        onChange={(e) => updateCreationConfig(idx, 'new_column', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Formula (e.g. colA + colB * 2)" 
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        value={cr.formula}
                        onChange={(e) => updateCreationConfig(idx, 'formula', e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => removeCreationConfig(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={addCreationConfig}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <Plus size={16} /> Add New Column Formula
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Eye size={18} className="text-slate-500" />
              Engineering Preview
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!previewResult ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <Info size={32} className="mb-3 text-slate-400" />
                <p>Configure feature engineering operations and click <br/><strong className="text-slate-700 dark:text-slate-300">Preview</strong> to see the results.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-3">Action Summary</h3>
                  {previewResult.summary.length === 0 ? (
                    <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">No features were engineered.</div>
                  ) : (
                    <ul className="space-y-2">
                      {previewResult.summary.map((msg, i) => (
                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                          <CheckCircle2 size={16} className={msg.startsWith('Failed') ? 'text-rose-500 mt-0.5 shrink-0' : 'text-green-500 mt-0.5 shrink-0'} />
                          <span className={msg.startsWith('Failed') ? 'text-rose-600 dark:text-rose-400 font-medium' : ''}>{msg}</span>
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
