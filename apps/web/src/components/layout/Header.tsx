"use client"

import React, { useState, useEffect } from 'react';
import { Search, Bell, HelpCircle, Settings, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const SEARCH_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Schedule Tasks', href: '/schedule' },
  { label: 'Datasets Management', href: '/datasets' },
  { label: 'Raw Data Process', href: '/raw-data' },
  { label: 'Data Sheet View', href: '/sheet' },
  { label: 'Profiling (EDA)', href: '/profiling' },
  { label: 'Data Cleaning', href: '/cleaning' },
  { label: 'Feature Engineering', href: '/feature-engineering' },
  { label: 'Visualizations Chart', href: '/visualization' },
  { label: 'Auto ML Models', href: '/automl' },
  { label: 'Free Sheet', href: '/free-sheet' },
  { label: 'SQL Query Studio', href: '/sql-studio' },
  { label: 'A/B Testing', href: '/ab-testing' },
  { label: 'Time Series Forecasting', href: '/time-series' },
  { label: 'Dashboard Builder', href: '/dashboard-builder' },
  { label: 'Data Lineage', href: '/data-lineage' },
  { label: 'Geospatial Analysis', href: '/geospatial' },
  { label: 'Customer Segmentation', href: '/segmentation' },
  { label: 'Market Basket Analysis', href: '/market-basket' },
  { label: 'Anomaly Detection', href: '/anomaly-detection' },
  { label: 'What-If Simulator', href: '/what-if' },
  { label: 'Cohort Analysis', href: '/cohort' },
  { label: 'Settings & Profile', href: '/settings' },
];

const Header = () => {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await fetch('/api/schedule');
        if (res.ok) {
          const data = await res.json();
          // Check if there are any pending schedules
          const hasPending = data.some((s: any) => s.status === 'pending');
          setHasNotification(hasPending);
        }
      } catch (e) {
        console.error("Failed to fetch schedules for notif");
      }
    };
    fetchSchedules();
    // Poll every 1 minute
    const interval = setInterval(fetchSchedules, 60000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = currentTime 
    ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentTime)
    : 'Loading...';
    
  const formattedTime = currentTime
    ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(currentTime)
    : '';

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-10 relative">
        <div className="flex-1 flex items-center">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 dark:bg-slate-800 dark:text-white"
              placeholder="Search features, tools, menus... (Ctrl + K)"
            />
            
            {/* Search Dropdown */}
            {isSearchFocused && searchQuery.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="max-h-64 overflow-y-auto py-2">
                  {SEARCH_LINKS.filter(link => link.label.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                    SEARCH_LINKS.filter(link => link.label.toLowerCase().includes(searchQuery.toLowerCase())).map((link, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          router.push(link.href);
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
                      >
                        <Search size={14} className="text-slate-400" />
                        {link.label}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Dynamic Date & Time */}
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>{formattedDate} {formattedTime && `• ${formattedTime}`}</span>
          </div>
          
          {/* Notification Bell */}
          <Link href="/schedule">
            <button 
              className={`relative p-2 text-slate-400 hover:text-slate-500 transition-colors ${hasNotification ? 'animate-pulse' : ''}`}
              title={hasNotification ? "Ada dataset yang harus diurus!" : "Tidak ada notifikasi baru"}
            >
              <Bell className="h-5 w-5" />
              {hasNotification && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
              )}
            </button>
          </Link>
          
          {/* Help / FAQ */}
          <button 
            className="relative p-2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
            onClick={() => setIsFaqOpen(true)}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          
          <button 
            className="p-2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 hidden dark:block" />
            <Moon className="h-5 w-5 block dark:hidden" />
          </button>
          
          <button className="p-2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
            <Settings className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-600">
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{session?.user?.name || 'Guest User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Data Analyst</p>
            </div>
          </div>
        </div>
      </header>

      {/* FAQ Modal */}
      {isFaqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Pertanyaan yang Sering Diajukan (FAQ)</h2>
              <button 
                onClick={() => setIsFaqOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200">Bagaimana cara mengaktifkan AI Analyst?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Anda bisa menekan tombol "Generate full report" di Dashboard Utama setelah mengunggah dataset.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200">Di mana saya bisa melihat jadwal dataset?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Buka menu <strong>Schedule</strong> pada sidebar. Di sana Anda bisa menandai tugas selesai, ditunda, atau dihapus.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200">Apakah saya bisa mengubah tema warna?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Tentu, gunakan ikon Bulan/Matahari di kanan atas untuk mengganti ke Mode Gelap atau Mode Terang.</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button 
                onClick={() => setIsFaqOpen(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
