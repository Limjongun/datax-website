"use client"

import React, { useRef, useState, useCallback } from 'react';
import SpreadsheetGrid from './components/SpreadsheetGrid';
import { HyperFormula } from 'hyperformula';
import { GridApi } from 'ag-grid-community';
import { Download, Upload, FileSpreadsheet, Keyboard, Sparkles, ArrowDown } from 'lucide-react';
import Papa from 'papaparse';

const FORMULA_SUGGESTIONS = [
  { name: 'SUM', desc: 'Adds all numbers in a range of cells' },
  { name: 'AVERAGE', desc: 'Returns the average (arithmetic mean)' },
  { name: 'COUNT', desc: 'Counts the number of cells containing numbers' },
  { name: 'MAX', desc: 'Returns the maximum value' },
  { name: 'MIN', desc: 'Returns the minimum value' },
  { name: 'IF', desc: 'Checks whether a condition is met' },
  { name: 'VLOOKUP', desc: 'Looks in the first column of an array' },
];

export default function FreeSheetPage() {
  const hfRef = useRef<HyperFormula | null>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  
  const [activeCellId, setActiveCellId] = useState<string>('');
  const [activeCellRaw, setActiveCellRaw] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<typeof FORMULA_SUGGESTIONS>([]);

  const handleCellFocus = useCallback((cellId: string, value: string, rawValue: string) => {
    setActiveCellId(cellId);
    setActiveCellRaw(rawValue);
    setShowSuggestions(false);
  }, []);

  const handleFormulaBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setActiveCellRaw(val);
    
    if (val.startsWith('=')) {
      const match = val.match(/=([A-Z]*)$/i);
      if (match && match[1]) {
        const query = match[1].toUpperCase();
        const matches = FORMULA_SUGGESTIONS.filter(s => s.name.startsWith(query));
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } else if (val === '=') {
        setSuggestions(FORMULA_SUGGESTIONS);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (name: string) => {
    setActiveCellRaw(`=${name}(`);
    setShowSuggestions(false);
  };

  const handleFormulaSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (!hfRef.current || !gridApiRef.current || !activeCellId) return;
    
    const match = activeCellId.match(/([A-Z]+)(\d+)/);
    if (!match) return;
    
    const colStr = match[1];
    const rowIdx = parseInt(match[2], 10) - 1;
    
    let colIdx = 0;
    for (let i = 0; i < colStr.length; i++) {
      colIdx = colIdx * 26 + (colStr.charCodeAt(i) - 64);
    }
    colIdx -= 1; 

    let parsedVal: any = activeCellRaw;
    if (!activeCellRaw.startsWith('=')) {
      const num = Number(activeCellRaw);
      parsedVal = (isNaN(num) || activeCellRaw === '') ? activeCellRaw : num;
    }
    
    hfRef.current.setCellContents({ sheet: 0, col: colIdx, row: rowIdx }, [[parsedVal]]);
    
    const rowNode = gridApiRef.current.getRowNode(String(rowIdx));
    if (rowNode) {
      rowNode.setDataValue(colStr, parsedVal);
    }
    
    gridApiRef.current.refreshCells({ force: true });
  };

  const handleFillDown = () => {
    if (!hfRef.current || !gridApiRef.current || !activeCellId) return;
    
    const match = activeCellId.match(/([A-Z]+)(\d+)/);
    if (!match) return;
    
    const colStr = match[1];
    const rowIdx = parseInt(match[2], 10) - 1;
    
    if (rowIdx === 0) return; // Cannot fill down on the very first row
    
    let colIdx = 0;
    for (let i = 0; i < colStr.length; i++) {
      colIdx = colIdx * 26 + (colStr.charCodeAt(i) - 64);
    }
    colIdx -= 1; 

    // Custom Formula parser to increment row numbers (handling absolute references)
    const formulaAbove = hfRef.current.getCellFormula({ sheet: 0, col: colIdx, row: rowIdx - 1 });
    const valAbove = hfRef.current.getCellValue({ sheet: 0, col: colIdx, row: rowIdx - 1 });
    
    let toInsert: any = '';
    
    if (formulaAbove) {
      toInsert = '=' + formulaAbove.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (match, colLock, colLetter, rowLock, rowNum) => {
        if (rowLock === '$') {
          return match;
        }
        return `${colLock}${colLetter}${rowLock}${parseInt(rowNum, 10) + 1}`;
      });
    } else {
      toInsert = valAbove;
    }
    
    hfRef.current.setCellContents({ sheet: 0, col: colIdx, row: rowIdx }, [[toInsert]]);
    
    const rowNode = gridApiRef.current.getRowNode(String(rowIdx));
    if (rowNode) {
      const newVal = hfRef.current.getCellValue({ sheet: 0, col: colIdx, row: rowIdx });
      rowNode.setDataValue(colStr, newVal);
    }
    
    gridApiRef.current.refreshCells({ force: true });
    
    // Update active cell bar
    const newFormula = hfRef.current.getCellFormula({ sheet: 0, col: colIdx, row: rowIdx });
    if (newFormula) {
      setActiveCellRaw(`=${newFormula}`);
    } else {
      const newVal = hfRef.current.getCellValue({ sheet: 0, col: colIdx, row: rowIdx });
      setActiveCellRaw(String(newVal ?? ''));
    }
  };

  const exportCsv = () => {
    if (!gridApiRef.current) return;
    gridApiRef.current.exportDataAsCsv({ fileName: 'data-lens-sheet.csv' });
  };

  const importCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hfRef.current || !gridApiRef.current) return;

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as any[][];
        if (data.length === 0) return;
        
        hfRef.current!.clearSheet(0);
        hfRef.current!.setCellContents({ sheet: 0, col: 0, row: 0 }, data);
        
        const formattedData: any[] = [];
        data.forEach((row, rowIndex) => {
          const rowObj: any = {};
          row.forEach((cellVal, colIndex) => {
            const colLetter = String.fromCharCode(65 + colIndex);
            rowObj[colLetter] = cellVal;
          });
          formattedData.push(rowObj);
        });

        gridApiRef.current!.setGridOption('rowData', formattedData);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col w-full flex-1 h-[calc(100vh-64px)] min-h-[600px] bg-slate-900 text-slate-200">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
            <FileSpreadsheet size={24} />
          </span>
          <h1 className="text-xl font-bold text-white">Free Sheet</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={importCsv} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors border border-slate-700"
          >
            <Upload size={16} />
            Open CSV
          </button>
          <button 
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            <Download size={16} />
            Save CSV
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center px-4 py-2 border-b border-slate-800 bg-slate-800/30 gap-2 relative">
        <div className="flex items-center justify-center bg-slate-800 text-slate-300 font-mono text-sm w-12 py-1.5 rounded border border-slate-700">
          {activeCellId || '-'}
        </div>
        <div className="flex items-center text-slate-500 px-2 font-bold italic">
          fx
        </div>
        <div className="flex-1 relative flex items-center gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={activeCellRaw}
              onChange={handleFormulaBarChange}
              onKeyDown={handleFormulaSubmit}
              placeholder="Select a cell or type a formula (e.g. =SUM(A1:A5)) and press Enter"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              disabled={!activeCellId}
            />
            <Keyboard className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 mt-1 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-700 text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <Sparkles size={12} className="text-emerald-400" /> REKOMENDASI FORMULA
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={s.name}
                    onClick={() => applySuggestion(s.name)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex flex-col"
                  >
                    <span className="font-mono font-bold text-emerald-400">{s.name}</span>
                    <span className="text-xs text-slate-400 truncate">{s.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={handleFillDown}
            disabled={!activeCellId || activeCellId.match(/\d+/)?.[0] === '1'}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap"
            title="Salin sel di atasnya ke sel ini (beserta perhitungan rumusnya)"
          >
            <ArrowDown size={14} />
            Fill Down
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden relative bg-slate-900">
        <SpreadsheetGrid 
          onCellFocus={handleCellFocus} 
          hfRef={hfRef} 
          gridApiRef={gridApiRef} 
        />
      </div>
    </div>
  );
}
