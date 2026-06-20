"use client";

import React, { useState } from 'react';
import { useDatasetStore } from '@/store/datasetStore';
import { ArrowLeft, Map, UploadCloud, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useReportStore } from '@/store/reportStore';

const MapComponent = dynamic(() => import('./components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse rounded-xl border border-slate-800 flex items-center justify-center text-slate-500">Memuat Peta Geospasial...</div>
});

export default function GeospatialPage() {
  const { activeDatasetId, columns, rowData } = useDatasetStore();
  const { addBlock } = useReportStore();
  
  const [latColumn, setLatColumn] = useState<string>('');
  const [lngColumn, setLngColumn] = useState<string>('');
  const [metricColumn, setMetricColumn] = useState<string>('');
  const [layerType, setLayerType] = useState<'markers' | 'heatmap' | 'choropleth'>('markers');
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  const handleGeoJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setGeoJsonData(json);
        setLayerType('choropleth');
      } catch (err) {
        alert("File GeoJSON tidak valid.");
      }
    };
    reader.readAsText(file);
  };

  const handleAddToReport = () => {
    const textContent = `Geospatial Analysis Configuration:\n- Layer Type: ${layerType}\n- Latitude Column: ${latColumn || 'N/A'}\n- Longitude Column: ${lngColumn || 'N/A'}\n- Metric Column: ${metricColumn || 'N/A'}\n- Map Rendered Successfully.`;
    addBlock('text', 'Geospatial Setup', textContent);
  };

  if (!activeDatasetId && layerType !== 'choropleth') {
    return (
      <div className="flex flex-col w-full flex-1 items-center justify-center h-full p-8 bg-slate-900">
        <h2 className="text-xl text-white">Tidak Ada Dataset Aktif</h2>
        <p className="text-slate-400 mt-2">Atau pilih tipe "Polygon Wilayah" untuk upload file GeoJSON langsung.</p>
        <button
          onClick={() => setLayerType('choropleth')}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Masuk Mode GeoJSON
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 h-screen bg-slate-900 text-slate-200">
      <div className="flex items-center p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0">
        <Link href="/" className="mr-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
              <Map size={24} />
            </span>
            Geospatial Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-1">Pemetaan data interaktif menggunakan Latitude, Longitude, dan GeoJSON.</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-slate-800 bg-slate-950 p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tipe Peta</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setLayerType('markers')}
                className={`p-2 text-sm text-left rounded-lg border transition-colors ${layerType === 'markers' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                📍 Pin / Markers
              </button>
              <button
                onClick={() => setLayerType('heatmap')}
                className={`p-2 text-sm text-left rounded-lg border transition-colors ${layerType === 'heatmap' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                🔥 Heatmap
              </button>
              <button
                onClick={() => setLayerType('choropleth')}
                className={`p-2 text-sm text-left rounded-lg border transition-colors ${layerType === 'choropleth' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                🗺️ Polygon Wilayah (GeoJSON)
              </button>
            </div>
          </div>

          {(layerType === 'markers' || layerType === 'heatmap') && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Kolom Latitude (Y)</label>
                <select value={latColumn} onChange={(e) => setLatColumn(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500">
                  <option value="">-- Pilih Kolom --</option>
                  {columns.map(c => <option key={c.field} value={c.field}>{c.field}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Kolom Longitude (X)</label>
                <select value={lngColumn} onChange={(e) => setLngColumn(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500">
                  <option value="">-- Pilih Kolom --</option>
                  {columns.map(c => <option key={c.field} value={c.field}>{c.field}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Metrik Bobot (Opsional)</label>
                <select value={metricColumn} onChange={(e) => setMetricColumn(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500">
                  <option value="">-- Pilih Kolom --</option>
                  {columns.map(c => <option key={c.field} value={c.field}>{c.field}</option>)}
                </select>
              </div>
            </>
          )}

          {layerType === 'choropleth' && (
            <div className="p-4 border border-dashed border-slate-700 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center text-center gap-3">
              <UploadCloud size={32} className="text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-300">Upload GeoJSON</p>
                <p className="text-xs text-slate-500 mt-1">Format batas wilayah (.geojson / .json)</p>
              </div>
              <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-sm text-white px-4 py-2 rounded-lg transition-colors">
                Pilih File
                <input type="file" accept=".json,.geojson" className="hidden" onChange={handleGeoJsonUpload} />
              </label>
              {geoJsonData && <p className="text-xs text-emerald-400 font-bold mt-2">✓ {geoJsonData.features?.length || 0} Polygon dimuat</p>}
            </div>
          )}
        </div>

        <div className="flex-1 p-6 relative">
          <div className="w-full h-full rounded-xl overflow-hidden border border-slate-800 relative z-0 flex flex-col">
            <div className="flex justify-end p-2 bg-slate-900 border-b border-slate-800 shrink-0">
              <button
                onClick={handleAddToReport}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors text-sm"
              >
                <PlusCircle size={16} /> Add to Report
              </button>
            </div>
            <div className="flex-1 min-h-0 relative z-0">
              <MapComponent 
                data={rowData || []}
                latColumn={latColumn}
                lngColumn={lngColumn}
                metricColumn={metricColumn}
                layerType={layerType}
                geoJsonData={geoJsonData}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
