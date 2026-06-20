"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/store/uiStore';
import { 
  LayoutDashboard, 
  Database, 
  Table, 
  BarChart2, 
  Sparkles, 
  GraduationCap, 
  FileText, 
  Settings, 
  LogOut,
  Brain,
  Terminal,
  Activity,
  TrendingUp,
  Layout,
  History,
  Map,
  Calendar,
  Users,
  ShoppingCart,
  AlertTriangle,
  Sliders,
  Layers
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  const { isAiModeOn, toggleAiMode } = useUiStore();
  
  return (
    <div className="flex flex-col w-64 h-screen bg-slate-900 text-slate-300 border-r border-slate-800">
      <div className="flex items-center justify-center h-16 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">D</span>
          </div>
          DataLens AI
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          <SidebarItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={pathname === '/'} />
          <SidebarItem href="/schedule" icon={<Calendar size={20} />} label="Schedule" active={pathname?.startsWith('/schedule')} />
          <SidebarItem href="/datasets" icon={<Database size={20} />} label="Datasets" active={pathname?.startsWith('/datasets')} />
          <SidebarItem href="/raw-data" icon={<Table size={20} />} label="Raw Data Process" active={pathname?.startsWith('/raw-data')} />
          <SidebarItem href="/sheet" icon={<Table size={20} />} label="Data Sheet" active={pathname?.startsWith('/sheet')} />
          <SidebarItem href="/profiling" icon={<BarChart2 size={20} />} label="Profiling (EDA)" active={pathname?.startsWith('/profiling')} />
          <SidebarItem href="/cleaning" icon={<Sparkles size={20} />} label="Data Cleaning" active={pathname?.startsWith('/cleaning')} />
          <SidebarItem href="/feature-engineering" icon={<Settings size={20} />} label="Feature Engineering" active={pathname?.startsWith('/feature-engineering')} />
          <SidebarItem href="/visualization" icon={<BarChart2 size={20} />} label="Visualizations" active={pathname?.startsWith('/visualization')} />
          <SidebarItem href="/automl" icon={<Brain size={20} />} label="Auto ML" active={pathname?.startsWith('/automl')} />
          <SidebarItem href="/free-sheet" icon={<Table size={20} />} label="Free Sheet" active={pathname?.startsWith('/free-sheet')} />
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Advanced Analytics
            </p>
          </div>
          
          <SidebarItem href="/sql-studio" icon={<Terminal size={20} />} label="SQL Query Studio" active={pathname?.startsWith('/sql-studio')} />
          <SidebarItem href="/ab-testing" icon={<Activity size={20} />} label="A/B Testing" active={pathname?.startsWith('/ab-testing')} />
          <SidebarItem href="/time-series" icon={<TrendingUp size={20} />} label="Time Series" active={pathname?.startsWith('/time-series')} />
          <SidebarItem href="/dashboard-builder" icon={<Layout size={20} />} label="Dashboard Builder" active={pathname?.startsWith('/dashboard-builder')} />
          <SidebarItem href="/data-lineage" icon={<History size={20} />} label="Data Lineage" active={pathname?.startsWith('/data-lineage')} />
          <SidebarItem href="/geospatial" icon={<Map size={20} />} label="Geospatial Analysis" active={pathname?.startsWith('/geospatial')} />

          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mega Analytics Hub
            </p>
          </div>
          
          <SidebarItem href="/segmentation" icon={<Users size={20} />} label="Customer Segmentation" active={pathname?.startsWith('/segmentation')} />
          <SidebarItem href="/market-basket" icon={<ShoppingCart size={20} />} label="Market Basket Analysis" active={pathname?.startsWith('/market-basket')} />
          <SidebarItem href="/anomaly-detection" icon={<AlertTriangle size={20} />} label="Anomaly Detection" active={pathname?.startsWith('/anomaly-detection')} />
          <SidebarItem href="/what-if" icon={<Sliders size={20} />} label="What-If Simulator" active={pathname?.startsWith('/what-if')} />
          <SidebarItem href="/cohort" icon={<Layers size={20} />} label="Cohort Analysis" active={pathname?.startsWith('/cohort')} />

          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AI & Learning
            </p>
          </div>
          
          <SidebarItem icon={<GraduationCap size={20} />} label="SQL Training Camp" />
          
          <div className="px-4 py-2 mt-2">
            <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${isAiModeOn ? 'bg-indigo-900/40 border-indigo-500' : 'bg-slate-800 border-slate-700'}`} onClick={toggleAiMode}>
              <div className="flex items-center gap-2">
                <Brain size={18} className={isAiModeOn ? 'text-indigo-400' : 'text-slate-400'} />
                <span className={`text-sm font-semibold ${isAiModeOn ? 'text-indigo-300' : 'text-slate-400'}`}>Omni AI Mode</span>
              </div>
              <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${isAiModeOn ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${isAiModeOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-tight">Nyalakan Omni AI untuk Analyst Melayang & Report Builder</p>
          </div>
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <SidebarItem href="/settings" icon={<Settings size={20} />} label="Settings" active={pathname?.startsWith('/settings')} />
        <SidebarItem icon={<LogOut size={20} />} label="Logout" />
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, active = false, badge, href = "#" }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string, href?: string }) => {
  return (
    <Link href={href} className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}>
      {icon}
      <span className="ml-3 flex-1">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 text-xs font-semibold bg-orange-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

export default Sidebar;
