import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type ReportBlockType = 'text' | 'chart' | 'data';

export interface ReportBlock {
  id: string;
  type: ReportBlockType;
  title: string;
  content: any;
}

interface ReportState {
  blocks: ReportBlock[];
  addBlock: (type: ReportBlockType, title: string, content: any) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<ReportBlock>) => void;
  clearReport: () => void;
  setBlocks: (blocks: ReportBlock[]) => void;
}

export const useReportStore = create<ReportState>((set) => ({
  blocks: [],
  addBlock: (type, title, content) => set((state) => ({
    blocks: [...state.blocks, { id: uuidv4(), type, title, content }]
  })),
  removeBlock: (id) => set((state) => ({
    blocks: state.blocks.filter(b => b.id !== id)
  })),
  updateBlock: (id, updates) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
  })),
  clearReport: () => set({ blocks: [] }),
  setBlocks: (blocks) => set({ blocks }),
}));
