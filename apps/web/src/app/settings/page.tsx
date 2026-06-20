"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSession, signOut } from 'next-auth/react';
import { 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  Info, 
  Activity, 
  Map as MapIcon, 
  Star, 
  Rocket, 
  Cpu, 
  Layers,
  Settings as SettingsIcon,
  BookOpen
} from 'lucide-react';

type TabType = 'account' | 'about' | 'roadmap';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('account');

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings & Profile</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Kelola preferensi akun Anda, pelajari lebih lanjut tentang platform, dan intip masa depan DataLens AI.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-8 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'account' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <User size={16} />
            Account & Preferences
          </button>
          
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'about' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Info size={16} />
            About DataLens AI
          </button>
          
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'roadmap' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <MapIcon size={16} />
            Future Roadmap
          </button>
        </div>

        {/* Content Area */}
        <div className="mt-4">
          
          {/* TAB: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Account Info Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <div className="px-6 pb-6 relative">
                  <div className="w-20 h-20 bg-slate-800 border-4 border-white dark:border-slate-900 rounded-2xl flex items-center justify-center -mt-10 mb-4 text-white text-3xl font-bold shadow-md">
                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {session?.user?.name || 'DataLens User'}
                  </h2>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4 text-sm">
                    <Mail size={16} />
                    <span>{session?.user?.email || 'user@example.com'}</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Shield size={16} className="text-indigo-500" />
                        <span className="text-sm">Role</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">Administrator</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Star size={16} className="text-amber-500" />
                        <span className="text-sm">Plan</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase">Pro (Enterprise)</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-100 dark:border-red-500/20"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Version Info Card */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">DataLens AI Core</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sistem berjalan dengan stabil.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">v1.2.0</span>
                  <span className="block text-[10px] text-slate-400">Build 8421</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ABOUT */}
          {activeTab === 'about' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">About DataLens AI</h2>
                </div>
                
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg mb-4">
                    DataLens AI (sebelumnya **Datax**) adalah platform *Unified Data Analytics* mutakhir yang menjembatani jurang pemisah antara data kompleks dan keputusan bisnis nyata.
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Dibangun dengan filosofi bahwa **"setiap orang berhak atas wawasan sekelas Data Scientist"**, platform ini dilengkapi dengan sistem asisten _Omni AI_ yang proaktif, pemodelan Machine Learning otomatis (AutoML), serta infrastruktur analitik berskala korporat mulai dari _Customer Segmentation_ hingga _Geospatial Intelligence_.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="block text-3xl font-bold text-indigo-500 mb-1">10+</span>
                      <span className="text-xs font-medium text-slate-500">Modul Analitik</span>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="block text-2xl font-bold text-emerald-500 mb-1 mt-1">AutoML</span>
                      <span className="text-xs font-medium text-slate-500">Terintegrasi</span>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="block text-2xl font-bold text-blue-500 mb-1 mt-1">Python</span>
                      <span className="text-xs font-medium text-slate-500">Backend Core</span>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="block text-2xl font-bold text-purple-500 mb-1 mt-1">Next.js</span>
                      <span className="text-xs font-medium text-slate-500">Frontend UI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl border border-indigo-800/50 shadow-xl p-6 md:p-8 relative overflow-hidden max-w-4xl">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-20"></div>
                
                <div className="flex items-center gap-3 mb-8 relative z-10">
                  <div className="p-2 bg-white/10 rounded-lg text-indigo-300 backdrop-blur">
                    <MapIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Future Roadmap</h2>
                    <p className="text-slate-400 text-sm mt-1">Intip inovasi revolusioner yang sedang kami kembangkan.</p>
                  </div>
                </div>

                <div className="space-y-8 relative z-10">
                  {/* Milestone 1 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                        <Rocket size={20} />
                      </div>
                      <div className="w-0.5 h-full bg-slate-700/50 my-2"></div>
                    </div>
                    <div className="pb-4 pt-1">
                      <h3 className="text-xl font-bold text-white mb-2">Direct Cloud Warehouse Integration</h3>
                      <p className="text-slate-400 leading-relaxed">
                        Ekspansi modul penarikan data untuk langsung terhubung ke <span className="text-indigo-300 font-medium">Google BigQuery</span>, <span className="text-blue-300 font-medium">Snowflake</span>, dan <span className="text-orange-300 font-medium">AWS Redshift</span> tanpa harus mengunggah file manual secara lokal.
                      </p>
                    </div>
                  </div>

                  {/* Milestone 2 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-400 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10">
                        <Cpu size={20} />
                      </div>
                      <div className="w-0.5 h-full bg-slate-700/50 my-2"></div>
                    </div>
                    <div className="pb-4 pt-1">
                      <h3 className="text-xl font-bold text-white mb-2">GenAI Data Storytelling</h3>
                      <p className="text-slate-400 leading-relaxed">
                        Omni AI akan berevolusi dari sekadar menjawab pertanyaan menjadi sistem pencipta cerdas. AI akan mampu **menciptakan presentasi slide (PPTX)** dan narasi laporan otomatis layaknya konsultan bisnis sungguhan hanya dalam 1 kali klik dari sekumpulan dataset.
                      </p>
                    </div>
                  </div>

                  {/* Milestone 3 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-400 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10">
                        <Layers size={20} />
                      </div>
                    </div>
                    <div className="pt-1">
                      <h3 className="text-xl font-bold text-white mb-2">Real-time Collaborative Dashboards</h3>
                      <p className="text-slate-400 leading-relaxed">
                        Kemampuan *multiplayer* sekelas Figma. Tim analis dan manajemen Anda dapat melihat kursor satu sama lain, menyunting grafik interaktif secara *real-time*, serta memberikan komentar langsung pada anomali titik data.
                      </p>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          )}
          
        </div>
      </div>
    </DashboardLayout>
  );
}
