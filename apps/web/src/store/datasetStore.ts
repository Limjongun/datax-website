import { create } from 'zustand';

export type ColumnDef = {
  field: string;
  headerName: string;
  type?: 'string' | 'number' | 'boolean' | 'date';
};

export interface DatasetHistoryItem {
  id: string;
  name: string;
  filePath?: string;
  totalRows?: number;
  columns: ColumnDef[];
  rowData: any[];
  lastUpdated: number;
}

export interface LineageNode {
  id: string;
  type: string;
  label: string;
  timestamp: number;
  details?: any;
  parentId?: string;
}

interface DatasetState {
  activeDatasetId: string | null;
  datasetName: string | null;
  filePath: string | null;
  totalRows: number;
  columns: ColumnDef[];
  rowData: any[];
  history: DatasetHistoryItem[];
  lineage: LineageNode[];
  isLoading: boolean;
  setDataset: (id: string, name: string, columns: ColumnDef[], rowData: any[], filePath?: string, totalRows?: number) => void;
  loadFromHistory: (id: string) => void;
  saveChanges: (updatedData: any[]) => void;
  addColumn: (columnName: string) => void;
  clearDataset: () => void;
  setIsLoading: (isLoading: boolean) => void;
  addLineageNode: (type: string, label: string, details?: any) => void;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  activeDatasetId: null,
  datasetName: null,
  filePath: null,
  totalRows: 0,
  columns: [],
  rowData: [],
  history: [],
  lineage: [],
  isLoading: false,
  
  setDataset: (id, name, columns, rowData, filePath, totalRows) => {
    const newItem: DatasetHistoryItem = {
      id,
      name,
      filePath,
      totalRows: totalRows || rowData.length,
      columns,
      rowData,
      lastUpdated: Date.now()
    };
    const lineageNode: LineageNode = {
      id: `node-${id}`,
      type: 'source',
      label: `Dataset Upload: ${name}`,
      timestamp: Date.now(),
      details: { rows: totalRows || rowData.length, columns: columns.length }
    };
    
    set((state) => ({ 
      activeDatasetId: id,
      datasetName: name, 
      filePath: filePath || null,
      totalRows: totalRows || rowData.length,
      columns, 
      rowData,
      history: [newItem, ...state.history],
      lineage: [lineageNode]
    }));
  },

  loadFromHistory: (id) => {
    const state = get();
    const item = state.history.find(h => h.id === id);
    if (item) {
      set({
        activeDatasetId: item.id,
        datasetName: item.name,
        columns: item.columns,
        rowData: item.rowData
      });
    }
  },

  saveChanges: (updatedData) => {
    set((state) => {
      if (!state.activeDatasetId) return state;
      
      const updatedHistory = state.history.map(item => 
        item.id === state.activeDatasetId 
          ? { ...item, rowData: updatedData, lastUpdated: Date.now() }
          : item
      );
      
      return {
        rowData: updatedData,
        history: updatedHistory
      };
    });
  },

  addColumn: (columnName) => {
    set((state) => {
      if (!state.activeDatasetId) return state;
      const newColumn: ColumnDef = { field: columnName, headerName: columnName, type: 'string' };
      const updatedColumns = [...state.columns, newColumn];
      
      const updatedHistory = state.history.map(item => 
        item.id === state.activeDatasetId 
          ? { ...item, columns: updatedColumns, lastUpdated: Date.now() }
          : item
      );

      return {
        columns: updatedColumns,
        history: updatedHistory
      };
    });
  },

  clearDataset: () => set({ activeDatasetId: null, datasetName: null, columns: [], rowData: [], lineage: [] }),
  setIsLoading: (isLoading) => set({ isLoading }),

  addLineageNode: (type, label, details) => {
    set((state) => {
      if (!state.activeDatasetId) return state;
      const lastNode = state.lineage.length > 0 ? state.lineage[state.lineage.length - 1] : null;
      
      const newNode: LineageNode = {
        id: `node-${Date.now()}`,
        type,
        label,
        timestamp: Date.now(),
        details,
        parentId: lastNode ? lastNode.id : undefined
      };
      
      return {
        lineage: [...state.lineage, newNode]
      };
    });
  },
}));
