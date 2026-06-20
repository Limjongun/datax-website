"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useDatasetStore } from '@/store/datasetStore';
import { Database, ArrowLeft, Play, LayoutTemplate, AlertCircle, Server, Lock, User, Globe, Hash, Key } from 'lucide-react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, ClientSideRowModelModule, ValidationModule } from 'ag-grid-community';
import CryptoJS from 'crypto-js';

// Register ag-grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule, ValidationModule]);

const SQL_TEMPLATES = [
  { name: "Select All", query: "SELECT * FROM data LIMIT 10;" },
  { name: "Count Rows", query: "SELECT COUNT(*) AS total_rows FROM data;" },
  { name: "Filter by Condition", query: "SELECT * FROM data WHERE column_name = 'value' LIMIT 10;" },
  { name: "Sort Ascending", query: "SELECT * FROM data ORDER BY column_name ASC LIMIT 10;" },
  { name: "Sort Descending", query: "SELECT * FROM data ORDER BY column_name DESC LIMIT 10;" },
  { name: "Group By Count", query: "SELECT column_name, COUNT(*) AS count FROM data GROUP BY column_name ORDER BY count DESC;" },
  { name: "Sum/Avg by Group", query: "SELECT category_column, SUM(numeric_column) AS total, AVG(numeric_column) AS average FROM data GROUP BY category_column;" },
  { name: "Find Duplicates", query: "SELECT column_name, COUNT(*) as count FROM data GROUP BY column_name HAVING COUNT(*) > 1;" },
  { name: "Min/Max Values", query: "SELECT MIN(column_name) AS min_val, MAX(column_name) AS max_val FROM data;" },
  { name: "Distinct Values", query: "SELECT DISTINCT column_name FROM data LIMIT 20;" },
  { name: "Count Distinct", query: "SELECT COUNT(DISTINCT column_name) AS unique_count FROM data;" }
];

export default function SQLStudioPage() {
  const { activeDatasetId, datasetName, columns, rowData } = useDatasetStore();
  
  const [connectionMode, setConnectionMode] = useState<'local' | 'external'>('local');
  
  const [dbConfig, setDbConfig] = useState({
    dbType: 'postgresql',
    host: 'localhost',
    port: '5432',
    user: 'postgres',
    password: '',
    dbName: 'postgres'
  });

  const [query, setQuery] = useState<string>('SELECT * FROM data LIMIT 10;');
  const [results, setResults] = useState<any[]>([]);
  const [resultColumns, setResultColumns] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  
  const gridRef = useRef<AgGridReact>(null);

  const encryptPassword = (pwd: string) => {
    if (!pwd) return '';
    const key = CryptoJS.enc.Utf8.parse('datax-secret-key-32-bytes-long!!');
    const encrypted = CryptoJS.AES.encrypt(pwd, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  };

  const handleExecute = async () => {
    if (!query.trim()) return;
    
    if (connectionMode === 'local' && !activeDatasetId) {
      setError("Tidak ada dataset lokal yang aktif.");
      return;
    }
    
    if (connectionMode === 'external' && (!dbConfig.host || !dbConfig.user || !dbConfig.dbName)) {
      setError("Harap lengkapi host, user, dan db name.");
      return;
    }
    
    setIsExecuting(true);
    setError(null);
    const startTime = performance.now();
    
    try {
      let endpoint = 'http://127.0.0.1:8000/api/sql/execute';
      let payload: any = { query };
      
      if (connectionMode === 'local') {
        payload.data = rowData;
      } else {
        endpoint = 'http://127.0.0.1:8000/api/sql/execute-external';
        payload = {
          query,
          db_type: dbConfig.dbType,
          host: dbConfig.host,
          port: Number(dbConfig.port) || (dbConfig.dbType === 'mysql' ? 3306 : 5432),
          user: dbConfig.user,
          encrypted_password: encryptPassword(dbConfig.password),
          db_name: dbConfig.dbName
        };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to execute query');
      }
      
      if (result.success) {
        setResults(result.data);
        const colDefs = result.columns.map((col: string) => ({
          field: col,
          headerName: col,
          sortable: true,
          filter: true,
          resizable: true,
        }));
        setResultColumns(colDefs);
      } else {
        throw new Error('Query execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during query execution');
    } finally {
      setIsExecuting(false);
      setExecutionTime(performance.now() - startTime);
    }
  };

  const renderSidebar = () => {
    if (connectionMode === 'local') {
      if (!activeDatasetId) {
        return (
          <div className="p-4 text-center text-slate-500 mt-10">
            <Database size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Silakan pilih dataset di dashboard terlebih dahulu.</p>
          </div>
        );
      }
      return (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <Database size={16} className="text-purple-400" />
              Tabel: <span className="text-purple-400 font-mono text-sm ml-1">data</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <ul className="space-y-1">
              {columns.map((col, idx) => (
                <li key={idx} className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 rounded-md cursor-pointer group">
                  <span className="text-sm font-mono text-slate-300 group-hover:text-purple-300 transition-colors">{col.field}</span>
                  <span className="text-xs text-slate-500">{col.type || 'any'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Server size={16} className="text-blue-400" />
            Koneksi Database
          </h3>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipe Database</label>
            <select 
              value={dbConfig.dbType}
              onChange={(e) => {
                const type = e.target.value;
                setDbConfig({...dbConfig, dbType: type, port: type === 'mysql' ? '3306' : '5432'});
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Host & Port</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input 
                  type="text" 
                  value={dbConfig.host}
                  onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 pl-8 text-sm text-slate-200 outline-none focus:border-blue-500"
                  placeholder="localhost"
                />
              </div>
              <div className="relative w-20">
                <Hash size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input 
                  type="text" 
                  value={dbConfig.port}
                  onChange={(e) => setDbConfig({...dbConfig, port: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 pl-8 text-sm text-slate-200 outline-none focus:border-blue-500"
                  placeholder="Port"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Database Name</label>
            <div className="relative">
              <Database size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input 
                type="text" 
                value={dbConfig.dbName}
                onChange={(e) => setDbConfig({...dbConfig, dbName: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 pl-8 text-sm text-slate-200 outline-none focus:border-blue-500"
                placeholder="public"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Username</label>
            <div className="relative">
              <User size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input 
                type="text" 
                value={dbConfig.user}
                onChange={(e) => setDbConfig({...dbConfig, user: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 pl-8 text-sm text-slate-200 outline-none focus:border-blue-500"
                placeholder="postgres"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input 
                type="password" 
                value={dbConfig.password}
                onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 pl-8 text-sm text-slate-200 outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Key size={10} /> Password dienkripsi AES ke server.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full flex-1 h-screen bg-slate-900 text-slate-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Kembali ke Dashboard">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="bg-purple-500/10 text-purple-400 p-2 rounded-lg">
                <LayoutTemplate size={20} />
              </span>
              SQL Query Studio
            </h1>
          </div>
        </div>
        
        {/* Mode Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => { setConnectionMode('local'); setQuery('SELECT * FROM data LIMIT 10;'); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              connectionMode === 'local' 
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Local Dataset
          </button>
          <button
            onClick={() => { setConnectionMode('external'); setQuery('SELECT * FROM my_table LIMIT 10;'); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              connectionMode === 'external' 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            External DB <Lock size={12} className="opacity-70" />
          </button>
        </div>

        <button
          onClick={handleExecute}
          disabled={isExecuting || !query.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium rounded-lg transition-colors shadow-lg shadow-purple-500/20"
        >
          {isExecuting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Play size={18} className="fill-current" />
          )}
          Run Query
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
          {renderSidebar()}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top - Editor */}
          <div className="h-1/2 border-b border-slate-800 flex flex-col">
            <div className="bg-slate-950 p-2 border-b border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium px-2 uppercase tracking-wider">Editor SQL</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 px-2 custom-scrollbar">
                {SQL_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(tpl.query)}
                    className="shrink-0 px-3 py-1 bg-slate-800 hover:bg-purple-600/20 hover:text-purple-300 text-slate-300 text-xs rounded-full border border-slate-700 hover:border-purple-500/50 transition-colors whitespace-nowrap"
                    title={tpl.query}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={query}
                onChange={(value) => setQuery(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          {/* Bottom - Results */}
          <div className="h-1/2 bg-slate-900 flex flex-col">
            <div className="bg-slate-950 p-2 border-b border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-400 font-medium px-2 uppercase tracking-wider">Hasil Query</span>
              {executionTime !== null && !error && (
                <span className="text-xs text-slate-400 mr-2">
                  Dieksekusi dalam <span className="text-green-400">{executionTime.toFixed(0)}ms</span> &bull; {results.length} baris
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0 relative bg-slate-900">
              {error ? (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center">
                  <AlertCircle size={48} className="text-red-500 mb-4" />
                  <h3 className="text-lg font-medium text-red-400 mb-2">Query Error</h3>
                  <p className="text-slate-400 font-mono text-sm max-w-2xl bg-slate-950 p-4 rounded-lg border border-red-900/50 break-words">
                    {error}
                  </p>
                </div>
              ) : results.length > 0 ? (
                <div className="w-full h-full ag-theme-alpine-dark">
                  <AgGridReact
                    theme="legacy"
                    ref={gridRef}
                    rowData={results}
                    columnDefs={resultColumns}
                    defaultColDef={{
                      flex: 1,
                      minWidth: 100,
                      sortable: true,
                      filter: true,
                      resizable: true,
                    }}
                    rowSelection="multiple"
                    animateRows={true}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-slate-500">Hasil query akan ditampilkan di sini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
