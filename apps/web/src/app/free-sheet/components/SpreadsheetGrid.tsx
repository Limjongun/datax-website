"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { HyperFormula } from 'hyperformula';
import { GridApi, CellValueChangedEvent, CellFocusedEvent, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Generate A to Z columns
const COLUMNS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const INITIAL_ROWS = 100;

interface SpreadsheetGridProps {
  onCellFocus: (cellId: string, value: string, rawValue: string) => void;
  hfRef: React.MutableRefObject<HyperFormula | null>;
  gridApiRef: React.MutableRefObject<GridApi | null>;
}

export default function SpreadsheetGrid({ onCellFocus, hfRef, gridApiRef }: SpreadsheetGridProps) {
  
  const [rowData] = useState(() => {
    return Array.from({ length: INITIAL_ROWS }, () => {
      const row: any = {};
      COLUMNS.forEach(col => row[col] = '');
      return row;
    });
  });

  const valueGetter = useCallback((params: any) => {
    if (!hfRef.current || params.node.rowIndex === null) return params.data?.[params.colDef.field];
    
    const colIndex = COLUMNS.indexOf(params.colDef.field);
    const val = hfRef.current.getCellValue({ sheet: 0, col: colIndex, row: params.node.rowIndex });
    
    // HyperFormula might return objects for errors or arrays
    if (val !== null && typeof val === 'object' && val.value) {
      return val.value;
    }
    return val;
  }, [hfRef]);

  const valueSetter = useCallback((params: any) => {
    const { newValue, node, colDef } = params;
    if (!hfRef.current || node.rowIndex === null) return false;
    
    const colIndex = COLUMNS.indexOf(colDef.field);
    
    // Parse formula or number
    let parsedVal: any = newValue;
    if (typeof newValue === 'string' && !newValue.startsWith('=')) {
      const num = Number(newValue);
      parsedVal = (isNaN(num) || newValue === '') ? newValue : num;
    }
    
    hfRef.current.setCellContents(
      { sheet: 0, col: colIndex, row: node.rowIndex },
      [[parsedVal]]
    );
    
    params.data[colDef.field] = parsedVal;
    return true;
  }, [hfRef]);

  const columnDefs = useMemo(() => {
    return COLUMNS.map(col => ({
      field: col,
      headerName: col,
      editable: true,
      valueGetter,
      valueSetter,
      width: 100,
    }));
  }, [valueGetter, valueSetter]);

  useEffect(() => {
    // Initialize HyperFormula
    const hfInstance = HyperFormula.buildEmpty({
      licenseKey: 'gpl-v3'
    });
    
    hfInstance.addSheet('Sheet1');
    hfRef.current = hfInstance;
    
    // Fill empty initial data into HF
    const hfData = Array.from({ length: INITIAL_ROWS }, () => Array(26).fill(''));
    hfInstance.setCellContents({ sheet: 0, col: 0, row: 0 }, hfData);

    return () => {
      hfInstance.destroy();
    };
  }, [hfRef]);

  const onCellValueChanged = useCallback((e: CellValueChangedEvent) => {
    // Refresh to show calculated results
    if (gridApiRef.current) {
      gridApiRef.current.refreshCells({ force: true });
    }
    
    updateFocusData(e.rowIndex, e.column.getColId());
  }, [gridApiRef]);

  const onCellFocused = useCallback((e: CellFocusedEvent) => {
    updateFocusData(e.rowIndex, e.column ? (typeof e.column === 'string' ? e.column : (e.column as any).getColId()) : null);
  }, []);

  const updateFocusData = (rowIndex: number | null, colId: string | null) => {
    if (rowIndex === null || !colId || !hfRef.current) return;
    
    const colIndex = COLUMNS.indexOf(colId);
    if (colIndex === -1) return;

    const formula = hfRef.current.getCellFormula({ sheet: 0, col: colIndex, row: rowIndex });
    const computedVal = hfRef.current.getCellValue({ sheet: 0, col: colIndex, row: rowIndex });
    
    const displayVal = computedVal !== null && typeof computedVal === 'object' && computedVal.value 
      ? computedVal.value 
      : computedVal;

    const rawValue = formula ? `=${formula}` : String(displayVal ?? '');
    const cellId = `${colId}${rowIndex + 1}`;
    
    onCellFocus(cellId, String(displayVal ?? ''), rawValue);
  };

  const onGridReady = (params: any) => {
    gridApiRef.current = params.api;
  };

  return (
    <div className="ag-theme-alpine-dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <AgGridReact
        theme="legacy"
        rowData={rowData}
        columnDefs={columnDefs}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        onCellFocused={onCellFocused}
        defaultColDef={{
          resizable: true,
          sortable: true,
        }}
      />
    </div>
  );
}
