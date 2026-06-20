"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useReportStore, ReportBlock } from '@/store/reportStore';
import { ArrowLeft, Download, Trash2, Plus, AlignLeft, Save } from 'lucide-react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { useReactToPrint } from 'react-to-print';
import { useRouter } from 'next/navigation';

export default function ReportBuilderPage() {
  const { blocks, addBlock, removeBlock, updateBlock, clearReport, setBlocks } = useReportStore();
  const componentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [title, setTitle] = useState("Laporan Analisis Data");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (id) {
      fetch(`/api/reports/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.report) {
            setTitle(data.report.title);
            try {
              const parsedBlocks = JSON.parse(data.report.content);
              setBlocks(parsedBlocks);
            } catch (e) {
              console.error("Failed to parse blocks");
            }
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [setBlocks]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: title || 'DataLens_AI_Report',
  });

  const handleSave = async () => {
    if (blocks.length === 0) {
      alert("Laporan masih kosong. Tambahkan konten sebelum menyimpan.");
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: blocks }),
      });
      
      if (!response.ok) throw new Error("Gagal menyimpan laporan");
      
      alert("Laporan berhasil disimpan!");
      router.push('/');
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan laporan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full flex-1 h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans transition-colors">
      <div className="flex items-center justify-between p-4 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm z-10 transition-colors">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Report Builder (Notepad)</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => addBlock('text', '', '')} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors">
            <Plus size={16} /> Tambah Teks
          </button>
          <button onClick={clearReport} className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium rounded-lg transition-colors">
            <Trash2 size={16} /> Bersihkan
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow transition-colors disabled:opacity-50">
            <Save size={16} /> {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow transition-colors">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-slate-100/50 dark:bg-slate-950/50">
        {isLoading ? (
          <div className="w-full max-w-4xl flex items-center justify-center h-64 text-slate-500">Memuat laporan...</div>
        ) : (
        <div 
          ref={componentRef} 
          className="w-full max-w-4xl bg-white dark:bg-slate-900 shadow-xl dark:shadow-none dark:border dark:border-slate-800 min-h-[1056px] h-max p-12 flex flex-col gap-8 print:shadow-none print:p-8 print:bg-white print:border-none print:text-black"
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 print:border-slate-200">
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-4xl font-extrabold text-slate-900 dark:text-white print:text-black w-full outline-none bg-transparent placeholder-slate-300 dark:placeholder-slate-700"
              placeholder="Judul Laporan Utama..."
            />
            <p className="text-slate-500 dark:text-slate-400 mt-2">Dihasilkan oleh DataLens AI Omni-Report</p>
          </div>

          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500 gap-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <AlignLeft size={48} className="text-slate-300 dark:text-slate-600" />
              <p>Laporan masih kosong. Tambahkan teks atau tekan tombol "Add to Report" di halaman visualisasi.</p>
            </div>
          ) : (
            blocks.map((block) => (
              <div key={block.id} className="group relative rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors p-4 -mx-4 print:hover:border-transparent">
                <button 
                  onClick={() => removeBlock(block.id)}
                  className="absolute -left-12 top-4 p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                  title="Hapus Blok"
                >
                  <Trash2 size={18} />
                </button>

                {block.type === 'text' && (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder="Tulis insight atau penjelasan di sini..."
                    className="w-full text-lg text-slate-700 dark:text-slate-300 print:text-black placeholder-slate-300 dark:placeholder-slate-700 outline-none resize-none bg-transparent leading-relaxed"
                    rows={Math.max(1, (block.content || '').split('\n').length)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                )}

                {block.type === 'chart' && block.content && (
                  <div className="flex flex-col gap-4">
                    <input 
                      type="text"
                      value={block.title}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      placeholder="Judul Visualisasi"
                      className="text-2xl font-bold text-slate-800 dark:text-white print:text-black outline-none bg-transparent"
                    />
                    <div className="h-[450px] w-full border border-slate-100 dark:border-slate-800 print:border-slate-200 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/50 print:bg-transparent">
                      <ReactECharts option={block.content} style={{ height: '100%', width: '100%' }} />
                    </div>
                  </div>
                )}

                {block.type === 'data' && block.content && (
                  <div className="flex flex-col gap-4">
                    <input 
                      type="text"
                      value={block.title}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      placeholder="Judul Data"
                      className="text-xl font-bold text-slate-800 dark:text-white print:text-black outline-none bg-transparent"
                    />
                    {/* Bug Fixed: Added overflow-x-auto, min-w, and whitespace-nowrap */}
                    <div className="w-full border border-slate-200 dark:border-slate-800 print:border-slate-200 rounded-xl bg-white dark:bg-slate-950 print:bg-transparent overflow-x-auto shadow-sm dark:shadow-none print:shadow-none">
                      <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 print:bg-slate-100 text-slate-600 dark:text-slate-400 print:text-slate-800 border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
                          <tr>
                            {Object.keys(block.content[0] || {}).map(k => (
                              <th key={k} className="p-3 font-semibold uppercase text-xs tracking-wider">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                          {block.content.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 print:hover:bg-transparent transition-colors">
                              {Object.values(row).map((v: any, j: number) => (
                                <td key={j} className="p-3 text-slate-700 dark:text-slate-300 print:text-black whitespace-nowrap">{String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        )}
      </div>
    </div>
  );
}
