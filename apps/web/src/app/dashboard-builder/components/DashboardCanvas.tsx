import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DashboardWidget, DashboardState } from '../types';
import { Settings, Trash2, Layout as LayoutIcon, X } from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardCanvasProps {
  state: DashboardState;
  onChange: (newState: DashboardState) => void;
}

// Temporary placeholders for widgets
const WidgetRenderer = ({ widget }: { widget: DashboardWidget }) => {
  const bgColor = widget.config?.backgroundColor || 'transparent';
  return (
    <div 
      className="h-full w-full flex flex-col p-4"
      style={{ backgroundColor: bgColor }}
    >
      <div className="text-gray-700 dark:text-gray-300 text-sm font-semibold">{widget.title}</div>
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg mt-2 border border-dashed border-gray-200 dark:border-gray-700">
        [ {widget.type} Placeholder ]
      </div>
    </div>
  );
};

export function DashboardCanvas({ state, onChange }: DashboardCanvasProps) {
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);

  const handleLayoutChange = (currentLayout: Layout[]) => {
    // Only update if it's the lg layout for simplicity in this demo, 
    // or store layouts per breakpoint if needed.
    onChange({ ...state, layout: currentLayout });
  };

  const handleSaveSettings = (id: string, updates: Partial<DashboardWidget>, layoutUpdates: {w: number, h: number}) => {
    onChange({
      ...state,
      widgets: state.widgets.map(w => w.id === id ? { ...w, ...updates } : w),
      layout: state.layout.map(l => (l as any).i === id ? { ...l, w: layoutUpdates.w, h: layoutUpdates.h } : l)
    });
    setActiveSettingsId(null);
  };

  const removeWidget = (id: string) => {
    onChange({
      ...state,
      widgets: state.widgets.filter((w) => w.id !== id),
      layout: state.layout.filter((l) => (l as any).i !== id),
    });
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 custom-scrollbar min-h-full">
      {state.widgets.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <LayoutIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <p>Click a widget on the left to add it to your canvas.</p>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout min-h-full"
          layouts={{ lg: state.layout as any }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          onLayoutChange={(layout) => handleLayoutChange(layout as any)}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
        >
          {state.widgets.map((widget) => {
            return (
              <div 
                key={widget.id} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative group flex flex-col"
              >
                {/* Header / Drag Handle */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-gray-100 dark:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-2 drag-handle cursor-move z-10 border-b border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                    Drag to move
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="text-gray-500 hover:text-blue-500 transition-colors p-1" 
                      onClick={() => setActiveSettingsId(widget.id)}
                    >
                      <Settings size={14} />
                    </button>
                    <button className="text-gray-500 hover:text-red-500 transition-colors p-1" onClick={() => removeWidget(widget.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                {/* Content */}
                <WidgetRenderer widget={widget} />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}

      {activeSettingsId && (
        <SettingsModal
          widget={state.widgets.find(w => w.id === activeSettingsId)!}
          layout={state.layout.find(l => (l as any).i === activeSettingsId)!}
          onClose={() => setActiveSettingsId(null)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}

// Inline Modal Component for Settings
function SettingsModal({ widget, layout, onClose, onSave }: any) {
  const [title, setTitle] = useState(widget.title);
  const [w, setW] = useState(layout.w);
  const [h, setH] = useState(layout.h);
  const [bgColor, setBgColor] = useState(widget.config?.backgroundColor || 'transparent');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-96 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Widget Settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Width (Cols 1-12)</label>
              <input 
                type="number" min={1} max={12}
                value={w} 
                onChange={(e) => setW(Number(e.target.value))}
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Height (Rows)</label>
              <input 
                type="number" min={1}
                value={h} 
                onChange={(e) => setH(Number(e.target.value))}
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Color</label>
            <select 
              value={bgColor} 
              onChange={(e) => setBgColor(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
            >
              <option value="transparent">Transparent / Default</option>
              <option value="#f87171">Red</option>
              <option value="#60a5fa">Blue</option>
              <option value="#34d399">Green</option>
              <option value="#fcd34d">Yellow</option>
              <option value="#1f2937">Dark Slate</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button 
            onClick={() => onSave(widget.id, { title, config: { ...widget.config, backgroundColor: bgColor } }, { w, h })}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
