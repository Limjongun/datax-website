"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useDatasetStore } from '@/store/datasetStore';
import { useReportStore } from '@/store/reportStore';
import { Sparkles, FileText, X, Send, Bot, User, Command, Zap } from 'lucide-react';
import { Rnd } from 'react-rnd';
import { useRouter, usePathname } from 'next/navigation';

export default function FloatingAssistant() {
  const { isAiModeOn, isAiChatOpen, setAiChatOpen, contextData, activeSelection, currentChartInfo } = useUiStore();
  const { datasetName, columns, history } = useDatasetStore();
  const { addBlock } = useReportStore();
  
  const router = useRouter();
  const pathname = usePathname();
  
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string, actions?: any[]}[]>([
    { role: 'ai', text: 'Halo! Saya DataLens AI. Saya sekarang ada di layar Anda. Tekan salah satu aksi cepat di bawah atau ketik pertanyaan Anda.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiChatOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isAiChatOpen]);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space to toggle Assistant
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setAiChatOpen(!isAiChatOpen);
        if (!isAiChatOpen) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiChatOpen, setAiChatOpen]);

  if (!mounted || !isAiModeOn) return null;

  const getQuickPrompts = () => {
    if (pathname.includes('/profiling')) {
      return ['Temukan anomali pada dataset ini', 'Jelaskan ringkasan kualitas data ini', 'Bantu bersihkan dataset ini'];
    }
    if (pathname.includes('/free-sheet')) {
      return ['Ekstrak insight dari tabel ini', 'Cari korelasi antar kolom numerik', 'Buatkan chart dari kolom yang dipilih'];
    }
    if (pathname.includes('/visualization')) {
      return ['Jelaskan tren pada chart ini', 'Buatkan narasi untuk report', 'Saran tipe visualisasi lain'];
    }
    if (pathname.includes('/sql-studio')) {
      return ['Jelaskan query SQL ini', 'Bantu saya optimasi query ini', 'Berikan contoh query lanjutan'];
    }
    return ['Beri tahu saya apa yang bisa Anda lakukan', 'Bantu saya menganalisis data ini', 'Lihat semua dataset', 'Buat visualisasi data'];
  };

  const executeActions = (actions: any[]) => {
    if (!actions) return;
    for (const action of actions) {
      if (action.type === 'ADD_TO_REPORT') {
        addBlock(action.payload.blockType || 'text', action.payload.title || '', action.payload.content || '');
      } else if (action.type === 'NAVIGATE') {
        router.push(action.payload.path);
      }
    }
  };

  const handleSend = async (forcedPrompt?: string) => {
    const textToSend = forcedPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8001/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          context: {
            pathname,
            datasetName,
            columns,
            contextData,
            activeSelection,
            currentChartInfo,
            availableDatasets: history.map((h: any) => h.name)
          }
        })
      });

      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.response_text || data.text || 'Done',
        actions: data.actions && data.actions.length > 0 ? data.actions : undefined 
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `Maaf, terjadi kesalahan: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-[9999]">
        <button 
          onClick={() => router.push('/report-builder')}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform hover:scale-110 group relative"
        >
          <FileText size={24} />
          <span className="absolute right-full mr-4 bg-slate-800 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity shadow-lg">
            Buka Report Builder
          </span>
        </button>
        
        <button 
          onClick={() => {
            setAiChatOpen(!isAiChatOpen);
            if (!isAiChatOpen) setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110 group relative"
        >
          <Sparkles size={24} />
          <span className="absolute right-full mr-4 bg-slate-800 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity shadow-lg">
            AI Analyst (Ctrl+Space)
          </span>
        </button>
      </div>

      {isAiChatOpen && (
        <Rnd
          default={{ x: window.innerWidth - 450, y: window.innerHeight - 600, width: 380, height: 500 }}
          minWidth={300}
          minHeight={400}
          bounds="window"
          className="z-[10000]"
          dragHandleClassName="drag-handle"
        >
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col w-full h-full relative">
            <div className="drag-handle bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center cursor-move">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-400" />
                <span className="font-semibold text-slate-200 text-sm">DataLens Omni-Assistant</span>
              </div>
              <button onClick={() => setAiChatOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-track]:rounded-r-lg [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-indigo-600/20 text-indigo-100 rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                      {m.text}
                    </div>
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {m.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => executeActions([action])}
                            className="bg-slate-700 hover:bg-emerald-600 border border-slate-600 hover:border-emerald-500 text-white text-xs py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Zap size={12} className="text-emerald-400 group-hover:text-white" />
                            <span>
                              Izinkan Aksi: {action.type === 'ADD_TO_REPORT' ? 'Tambah ke Laporan' : action.type === 'NAVIGATE' ? 'Buka Halaman' : action.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-600">
                    <Bot size={16} />
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800 text-slate-400 rounded-tl-none border border-slate-700 text-sm flex items-center gap-2">
                    <span className="animate-pulse">Berpikir...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-slate-700 bg-slate-800 flex flex-col gap-2 shrink-0">
              {/* Quick Prompts */}
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {getQuickPrompts().map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-emerald-300 text-xs rounded-full border border-slate-600 transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    <Zap size={12} /> {prompt}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Tanya soal data..." 
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  disabled={isLoading}
                />
                <button 
                  onClick={() => handleSend()} 
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white p-2 rounded-lg transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="text-[10px] text-slate-500 text-center w-full mt-1 flex justify-center items-center gap-1">
                <Command size={10} /> Tip: Gunakan <strong className="text-slate-400">Ctrl + Space</strong> untuk akses cepat
              </div>
            </div>
            
            {/* Visual indicator for resizing */}
            <div className="absolute bottom-1 right-1 w-3 h-3 pointer-events-none opacity-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <polyline points="21 15 21 21 15 21"></polyline>
                <line x1="21" y1="21" x2="15" y2="15"></line>
              </svg>
            </div>
          </div>
        </Rnd>
      )}
    </>
  );
}
