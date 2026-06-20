import { create } from 'zustand';

interface UiState {
  isAiModeOn: boolean;
  isAiChatOpen: boolean;
  contextData: any;
  activeSelection?: any;
  currentChartInfo?: any;
  toggleAiMode: () => void;
  setAiChatOpen: (isOpen: boolean) => void;
  setContextData: (data: any) => void;
  setActiveSelection: (data: any) => void;
  setCurrentChartInfo: (data: any) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isAiModeOn: false,
  isAiChatOpen: false,
  contextData: null,
  activeSelection: null,
  currentChartInfo: null,
  toggleAiMode: () => set((state) => ({ isAiModeOn: !state.isAiModeOn, isAiChatOpen: false })),
  setAiChatOpen: (isOpen) => set({ isAiChatOpen: isOpen }),
  setContextData: (data) => set({ contextData: data }),
  setActiveSelection: (data) => set({ activeSelection: data }),
  setCurrentChartInfo: (data) => set({ currentChartInfo: data }),
}));
