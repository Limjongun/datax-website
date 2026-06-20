"use client"
import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { WidgetToolbar } from './components/WidgetToolbar';
import { DashboardCanvas } from './components/DashboardCanvas';
import { DashboardState, WidgetType, DashboardWidget } from './types';
import { Save, Code } from 'lucide-react';
import type { Layout } from 'react-grid-layout';

export default function DashboardBuilderPage() {
  const [dashboard, setDashboard] = useState<DashboardState>({
    name: 'My Custom Dashboard',
    widgets: [],
    layout: []
  });

  const [showJson, setShowJson] = useState(false);

  const addWidget = (type: WidgetType) => {
    const id = `widget-${Date.now()}`;
    const newWidget: DashboardWidget = {
      id,
      type,
      title: `New ${type.replace('-', ' ')}`,
      config: {}
    };
    
    // Determine default size
    let w = 4;
    let h = 8;
    if (type === 'kpi-card') { w = 3; h = 4; }
    if (type === 'data-table') { w = 12; h = 10; }

    const newLayout: any = {
      i: id,
      x: (dashboard.widgets.length * 4) % 12, // Simple placement logic
      y: Infinity, // puts it at the bottom
      w,
      h
    };

    setDashboard({
      ...dashboard,
      widgets: [...dashboard.widgets, newWidget],
      layout: [...dashboard.layout, newLayout]
    });
  };

  return (
    <div className="flex w-full flex-1 h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Builder</h1>
            <p className="text-xs text-gray-500">Drag, drop, and configure analytical widgets</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowJson(!showJson)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showJson ? 'bg-slate-800 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <Code size={16} className="mr-2" />
              {showJson ? 'Hide JSON' : 'Show JSON Layout'}
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Save size={16} className="mr-2" />
              Save Dashboard
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          <WidgetToolbar onAddWidget={addWidget} />
          
          <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50 dark:bg-gray-900">
            <DashboardCanvas state={dashboard} onChange={setDashboard} />
            
            {/* JSON Overlay for Demonstration */}
            {showJson && (
              <div className="absolute top-4 right-4 w-[450px] max-h-[90%] bg-slate-900 text-green-400 p-5 rounded-xl shadow-2xl overflow-y-auto text-xs font-mono border border-slate-700 z-50">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                  <span className="text-white font-bold text-sm">Dashboard JSON State</span>
                  <button onClick={() => setShowJson(false)} className="text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded">Close</button>
                </div>
                <div className="text-slate-400 mb-4 pb-2 border-b border-slate-800">
                  This entire JSON object can be serialized and stored in a PostgreSQL/MongoDB database. When fetched, the dashboard will render exactly as arranged.
                </div>
                <pre className="whitespace-pre-wrap word-break">{JSON.stringify(dashboard, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
