"use client"

import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useDatasetStore } from '@/store/datasetStore';
import { Brain, Play, Target, CheckSquare, Sparkles, ScatterChart, AlertCircle, PlusCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';
import { useReportStore } from '@/store/reportStore';

const MODELS = [
  { id: 'linear', name: 'Linear Regression', desc: 'Simple & fast, suitable for straight linear relationships.' },
  { id: 'polynomial', name: 'Polynomial Regression', desc: 'Suitable for data forming curved patterns.' },
  { id: 'ridge', name: 'Ridge Regression', desc: 'Linear with L2 penalty to prevent overfitting.' },
  { id: 'lasso', name: 'Lasso Regression', desc: 'Linear with L1 penalty, can ignore useless features.' },
  { id: 'random_forest', name: 'Random Forest Regressor', desc: 'Accurate & stable, using many Decision Trees.' },
  { id: 'knn', name: 'K-Nearest Neighbors (KNN)', desc: 'Finds nearest data similarities (K=5).' },
  { id: 'svr', name: 'Support Vector Regression (SVR)', desc: 'Suitable for complex non-linear data (RBF Kernel).' },
];

export default function AutoMLPage() {
  const datasetName = useDatasetStore(state => state.datasetName);
  const data = useDatasetStore(state => state.rowData);
  const { addBlock } = useReportStore();
  
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [featureColumns, setFeatureColumns] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('random_forest');
  const [testSize, setTestSize] = useState<number>(0.2);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Prediction Form States
  const [predictionInputs, setPredictionInputs] = useState<Record<string, string>>({});
  const [predictionResult, setPredictionResult] = useState<number | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Extract all columns
  const allColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const toggleFeature = (col: string) => {
    if (featureColumns.includes(col)) {
      setFeatureColumns(featureColumns.filter(c => c !== col));
    } else {
      setFeatureColumns([...featureColumns, col]);
    }
  };

  const selectAllFeatures = () => {
    setFeatureColumns(allColumns.filter(c => c !== targetColumn));
  };

  const clearFeatures = () => {
    setFeatureColumns([]);
  };

  const runAutoML = async () => {
    if (!targetColumn) {
      setError("Please select a Target Column first.");
      return;
    }
    if (featureColumns.length === 0) {
      setError("Select at least one Feature Column.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setPredictionResult(null);
    setPredictionError(null);
    setPredictionInputs({});

    try {
      const response = await fetch("http://localhost:8000/api/automl/regression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          target_column: targetColumn,
          feature_columns: featureColumns,
          model_type: selectedModel,
          test_size: testSize
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || "An error occurred while training the model.");
      }

      setResult(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredict = async () => {
    setIsPredicting(true);
    setPredictionError(null);
    setPredictionResult(null);

    try {
      const numericInputs: Record<string, number> = {};
      for (const key of featureColumns) {
        numericInputs[key] = parseFloat(predictionInputs[key]) || 0;
      }

      const response = await fetch("http://localhost:8000/api/automl/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          target_column: targetColumn,
          feature_columns: featureColumns,
          model_type: selectedModel,
          inputs: numericInputs
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || "An error occurred during prediction.");
      }

      setPredictionResult(resData.prediction);
    } catch (err: any) {
      setPredictionError(err.message);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleAddToReport = () => {
    if (result) {
      const metrics = [
        { Metrik: 'R² Score', Nilai: `${(result.metrics.r2 * 100).toFixed(2)}%` },
        { Metrik: 'RMSE', Nilai: result.metrics.rmse.toFixed(4) },
        { Metrik: 'MAE', Nilai: result.metrics.mae.toFixed(4) },
      ];
      addBlock('data', `AutoML Metrics: ${targetColumn}`, metrics);
      addBlock('chart', `AutoML Scatter: ${targetColumn}`, getScatterOptions());
      if (result.importance && result.importance.length > 0) {
        addBlock('chart', `AutoML Importance: ${targetColumn}`, getImportanceOptions());
      }
      if (result.equation) {
        addBlock('text', `AutoML Equation: ${targetColumn}`, `Formula: \n${result.equation}`);
      }
    }
  };

  // ECharts Configurations
  const getScatterOptions = () => {
    if (!result || !result.plot_data) return {};
    return {
      title: { text: 'Actual vs Predicted', textStyle: { color: '#64748b', fontSize: 14, fontWeight: 'normal' }, left: 'center' },
      tooltip: { trigger: 'item' },
      xAxis: { 
        type: 'value', 
        name: 'Actual Values', 
        nameLocation: 'middle', 
        nameGap: 30,
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } }
      },
      yAxis: { 
        type: 'value', 
        name: 'Predicted Values',
        nameLocation: 'middle',
        nameGap: 40,
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } }
      },
      grid: { left: '15%', right: '10%', bottom: '15%', top: '15%' },
      series: [
        {
          type: 'scatter',
          data: result.plot_data.map((d: any) => [d.actual, d.predicted]),
          itemStyle: { color: '#3b82f6', opacity: 0.7 },
          symbolSize: 8
        },
        {
          type: 'line',
          data: [
            [Math.min(...result.plot_data.map((d:any)=>d.actual)), Math.min(...result.plot_data.map((d:any)=>d.actual))],
            [Math.max(...result.plot_data.map((d:any)=>d.actual)), Math.max(...result.plot_data.map((d:any)=>d.actual))]
          ],
          lineStyle: { color: '#ef4444', type: 'dashed', width: 2 },
          symbol: 'none'
        }
      ]
    };
  };

  const getImportanceOptions = () => {
    if (!result || !result.importance || result.importance.length === 0) return {};
    
    // Sort descending for visual
    const sorted = [...result.importance].sort((a, b) => a.importance - b.importance);
    
    return {
      title: { text: 'Feature Importance / Coefficients', textStyle: { color: '#64748b', fontSize: 14, fontWeight: 'normal' }, left: 'center' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } } },
      yAxis: { 
        type: 'category', 
        data: sorted.map(d => d.feature),
        axisLabel: { color: '#64748b' }
      },
      series: [
        {
          type: 'bar',
          data: sorted.map(d => d.importance),
          itemStyle: {
            color: (params: any) => params.value > 0 ? '#10b981' : '#f43f5e',
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };
  };

  if (!datasetName || !data || data.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
            <Brain size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Dataset Found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You need to upload a dataset before running AutoML.
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="text-blue-600" size={28} />
            AutoML: Regression
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Automatically predict target values using Machine Learning for: <span className="font-semibold text-slate-700 dark:text-slate-300">{datasetName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runAutoML}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Play size={18} />
            )}
            Run AutoML
          </button>
          {result && !isLoading && (
            <button
              onClick={handleAddToReport}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <PlusCircle size={18} />
              Add to Report
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        {/* Left Column: Config */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Target size={18} className="text-slate-500" />
              Configuration
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Target Selection */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                1. Select Target (Y)
              </h3>
              <p className="text-xs text-slate-500 mb-3">Which numeric column do you want to predict?</p>
              <select
                value={targetColumn}
                onChange={(e) => {
                  setTargetColumn(e.target.value);
                  setFeatureColumns(featureColumns.filter(c => c !== e.target.value));
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Select Target Column --</option>
                {allColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Features Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  2. Select Features (X)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">Which columns determine the outcome?</p>
              
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[250px]">
                <div className="flex bg-slate-50 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 gap-2">
                  <button onClick={selectAllFeatures} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded">Select All</button>
                  <button onClick={clearFeatures} className="text-xs font-medium text-slate-600 hover:text-slate-700 flex-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded">Clear</button>
                </div>
                <div className="overflow-y-auto p-2 space-y-1">
                  {allColumns.map(col => {
                    if (col === targetColumn) return null;
                    return (
                      <label key={col} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${featureColumns.includes(col) ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <input 
                          type="checkbox"
                          checked={featureColumns.includes(col)}
                          onChange={() => toggleFeature(col)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{col}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                3. Select Algorithm
              </h3>
              <div className="space-y-3">
                {MODELS.map(model => (
                  <label key={model.id} className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${selectedModel === model.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio"
                        name="ml_model"
                        value={model.id}
                        checked={selectedModel === model.id}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-200">{model.name}</span>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 ml-6">{model.desc}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8 space-y-6 h-full flex flex-col">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-medium">Execution Error</h4>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 min-h-[400px]">
              <Brain size={64} className="mb-4 text-slate-300 opacity-50" strokeWidth={1} />
              <p>Configure parameters on the left, then click <b>Run AutoML</b>.</p>
            </div>
          )}

          {isLoading && (
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-blue-600 min-h-[400px]">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="font-medium animate-pulse">Training {MODELS.find(m => m.id === selectedModel)?.name}...</p>
              <p className="text-sm text-slate-500 mt-2">Tuning hyperparameters and calculating accuracy</p>
            </div>
          )}

          {result && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                  <span className="text-slate-500 text-sm font-medium mb-1">R² Score (Accuracy)</span>
                  <span className={`text-3xl font-bold ${(result.metrics.r2 > 0.7) ? 'text-emerald-500' : (result.metrics.r2 > 0.4 ? 'text-yellow-500' : 'text-rose-500')}`}>
                    {(result.metrics.r2 * 100).toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-400 mt-2">Closer to 100% means highly accurate prediction.</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                  <span className="text-slate-500 text-sm font-medium mb-1">RMSE</span>
                  <span className="text-3xl font-bold text-blue-500">
                    {result.metrics.rmse.toFixed(4)}
                  </span>
                  <span className="text-xs text-slate-400 mt-2">Root Mean Squared Error. Lower is better.</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                  <span className="text-slate-500 text-sm font-medium mb-1">MAE</span>
                  <span className="text-3xl font-bold text-purple-500">
                    {result.metrics.mae.toFixed(4)}
                  </span>
                  <span className="text-xs text-slate-400 mt-2">Mean Absolute Error. Lower is better.</span>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <ReactECharts option={getScatterOptions()} style={{ height: '350px', width: '100%' }} />
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  {result.importance && result.importance.length > 0 ? (
                    <ReactECharts option={getImportanceOptions()} style={{ height: '350px', width: '100%' }} />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-slate-500 text-center px-6">
                      This model type (e.g., KNN or SVR) does not natively provide feature importance weights.
                    </div>
                  )}
                </div>
              </div>

              {/* Formula Card */}
              {result.equation && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                  <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    Mathematical Formula (Prediction Equation)
                  </h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-x-auto text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {result.equation}
                  </div>
                </div>
              )}

              {/* Interactive Prediction Form */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <CheckSquare size={18} className="text-emerald-500" />
                  Try it out! (Interactive Prediction)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {featureColumns.map((col) => (
                    <div key={col}>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {col}
                      </label>
                      <input
                        type="number"
                        value={predictionInputs[col] || ''}
                        onChange={(e) => setPredictionInputs(prev => ({ ...prev, [col]: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder={`Enter ${col}...`}
                      />
                    </div>
                  ))}
                </div>
                
                {predictionError && (
                  <div className="text-rose-500 text-sm mb-3">Error: {predictionError}</div>
                )}

                <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    onClick={handlePredict}
                    disabled={isPredicting || featureColumns.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isPredicting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Target size={16} />
                    )}
                    Predict Y
                  </button>

                  {predictionResult !== null && (
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                      <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">Predicted {targetColumn}:</span>
                      <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{predictionResult.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
