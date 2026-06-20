"use client"

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Calendar, CheckCircle2, Clock, Trash2, Plus, X } from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  datasetId: string;
  dataset: { name: string };
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedType, setSelectedType] = useState('Data Cleaning');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/datasets'); // Mocked if not available yet
      if (res.ok) {
        const data = await res.json();
        setDatasets(data);
      } else {
        // Fallback for UI if API doesn't exist
        setDatasets([{ id: 'dummy-dataset-1', name: 'sales_data.csv' }]);
      }
    } catch (error) {
      console.error(error);
      setDatasets([{ id: 'dummy-dataset-1', name: 'sales_data.csv' }]);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchDatasets();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) fetchSchedules();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchSchedules();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset || !selectedDate || !selectedTime) return;
    
    const dateTimeString = `${selectedDate}T${selectedTime}:00`;
    
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          datasetId: selectedDataset, 
          type: selectedType, 
          scheduledAt: dateTimeString 
        })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchSchedules();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Group schedules by date
  const groupedSchedules = schedules.reduce((acc: any, curr) => {
    const dateObj = new Date(curr.scheduledAt);
    const dateStr = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateObj);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-500" /> Jadwal & Tugas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola antrean pemrosesan dataset Anda di sini.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Buat Jadwal Baru
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Memuat jadwal...</div>
      ) : Object.keys(groupedSchedules).length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Belum ada jadwal</h3>
          <p className="text-slate-500 mt-1 text-sm">Buat jadwal baru untuk mulai memproses data secara otomatis.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedSchedules).map(dateGroup => (
            <div key={dateGroup} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{dateGroup}</h2>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {groupedSchedules[dateGroup].map((task: Schedule) => {
                  const taskTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(task.scheduledAt));
                  
                  return (
                    <div key={task.id} className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${task.status === 'done' ? 'bg-slate-50/50 dark:bg-slate-900/30 opacity-70' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 flex-shrink-0 w-3 h-3 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                        <div>
                          <h3 className={`font-semibold ${task.status === 'done' ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                            {task.dataset?.name || 'Unknown Dataset'}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {task.type}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {taskTime}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        {task.status !== 'done' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(task.id, 'done')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                            </button>
                            {/* Tunda logic can open a date picker, but for simplicity we skip it for now */}
                          </>
                        )}
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {task.status === 'done' ? 'Hapus Riwayat' : 'Batalkan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Buat Jadwal Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateSchedule} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Dataset</label>
                <select 
                  required
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="" disabled>-- Pilih Dataset --</option>
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  {datasets.length === 0 && <option value="test-id" disabled>No datasets available</option>}
                </select>
                {datasets.length === 0 && <p className="text-xs text-orange-500 mt-1">Anda perlu mengunggah dataset terlebih dahulu. (Catatan: Form ini masih Mock untuk Dataset ID jika tidak ada data)</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Tugas</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="Data Cleaning">Data Cleaning</option>
                  <option value="AI Profiling">AI Profiling</option>
                  <option value="EDA Report">EDA Report</option>
                  <option value="Auto ML Training">Auto ML Training</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input 
                    type="date" required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Waktu</label>
                  <input 
                    type="time" required
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-white"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium mt-4"
              >
                Simpan Jadwal
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
