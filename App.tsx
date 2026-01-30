
import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { FindingCard } from './components/FindingCard';
import { SummaryTable } from './components/SummaryTable';
import { extractRadiologyData } from './geminiService';
import { ExtractionResult, Status, SessionReport, AppView, ExtractionMethod } from './types';

const EXAMPLE_REPORT = `CHEST X-RAY PA/LATERAL
Lungs: Focal consolidation in RLL. Heart size is normal.
Impression: RLL Pneumonia.`;

function App() {
  // Navigation & Workflow
  const [view, setView] = useState<AppView>('LANDING');
  const [method, setMethod] = useState<ExtractionMethod | null>(null);
  const [status, setStatus] = useState<Status>(Status.IDLE);
  
  // Data State
  const [inputText, setInputText] = useState('');
  const [keyId, setKeyId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [currentExtraction, setCurrentExtraction] = useState<ExtractionResult | null>(null);
  const [history, setHistory] = useState<SessionReport[]>([]);
  
  // UI State
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Method 1: Manual Handle
  const handleManualExtract = async () => {
    if (!keyId.trim()) { setError("Patient ID is required."); return; }
    if (!inputText.trim()) { setError("Report text is required."); return; }
    
    setStatus(Status.LOADING);
    setError(null);
    try {
      const data = await extractRadiologyData(inputText);
      if (data.is_medical_report === false) {
        setShowWarning(true);
        setStatus(Status.IDLE);
        return; 
      }
      setCurrentExtraction(data);
      setStatus(Status.SUCCESS);
      setView('REVIEW');
    } catch (err) {
      setError("Extraction failed. Please check connectivity.");
      setStatus(Status.ERROR);
    }
  };

  // Method 2: CSV Handle
  const downloadTemplate = () => {
    const csvContent = "PatientID,OrderID,Report_Text\nP-101,ORD-501,\"CHEST X-RAY: Clear lungs.\"\nP-102,ORD-502,\"CT HEAD: No acute hemorrhage.\"";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "radiology_template.csv";
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      
      const dataRows = lines.slice(1).map(line => {
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!matches) return null;
        return matches.map(m => m.replace(/^"|"$/g, ''));
      }).filter(row => row !== null) as string[][];

      if (dataRows.length > 500) {
        setError("Limit exceeded: Max 500 records allowed per batch.");
        return;
      }

      if (dataRows.length === 0) {
        setError("The uploaded CSV appears to be empty or incorrectly formatted.");
        return;
      }

      processBatch(dataRows);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processBatch = async (rows: string[][]) => {
    setStatus(Status.BATCH_PROCESSING);
    setBatchProgress({ current: 0, total: rows.length });
    const batchResults: SessionReport[] = [];

    for (let i = 0; i < rows.length; i++) {
      const [pId, oId, rText] = rows[i];
      if (!rText) {
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));
        continue;
      }

      try {
        const data = await extractRadiologyData(rText);
        if (data.is_medical_report) {
          batchResults.push({
            id: crypto.randomUUID(),
            keyId: pId || `PAT-${i+1}`,
            orderId: oId || `ORD-${i+1}`,
            timestamp: new Date().toLocaleString(),
            rawText: rText,
            extraction: data
          });
        }
      } catch (e) {
        console.error(`Row ${i} failed`, e);
      }
      setBatchProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setHistory(prev => [...prev, ...batchResults]);
    setStatus(Status.SUCCESS);
    setView('SUMMARY');
  };

  const handleCloseWarning = () => {
    setShowWarning(false);
    setInputText('');
  };

  const saveAndNextManual = () => {
    if (currentExtraction) {
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        keyId, orderId,
        timestamp: new Date().toLocaleString(),
        rawText: inputText,
        extraction: currentExtraction
      }]);
      setInputText(''); setKeyId(''); setOrderId('');
      setCurrentExtraction(null); setStatus(Status.IDLE);
      setView('INPUT');
    }
  };

  const finishManual = () => {
    if (currentExtraction) {
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        keyId, orderId,
        timestamp: new Date().toLocaleString(),
        rawText: inputText,
        extraction: currentExtraction
      }]);
      setInputText(''); setKeyId(''); setOrderId('');
      setCurrentExtraction(null); setStatus(Status.IDLE);
    }
    setView('SUMMARY');
  };

  const resetAll = () => {
    setHistory([]); setView('LANDING'); setMethod(null);
    setInputText(''); setKeyId(''); setOrderId('');
    setCurrentExtraction(null); setStatus(Status.IDLE); setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative font-sans">
      <Header />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 pt-12 pb-8">
        
        {/* LANDING: Method Selection */}
        {view === 'LANDING' && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center mb-16">
                <span className="text-indigo-600 font-black text-xs uppercase tracking-[0.5em] mb-4 block">Radiology Report Extraction Suite v0.3</span>
                <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Select Extraction Workflow</h2>
                <p className="text-slate-500 max-w-xl mx-auto text-lg">
                  Choose between manual single-report copy-paste text method or<br />
                  high-throughput batch processing method.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Method 1 Card */}
                <button 
                    onClick={() => { setMethod('MANUAL'); setView('INPUT'); }}
                    className="group relative bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 text-left transition-all hover:shadow-2xl hover:-translate-y-2 active:scale-95 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                    </div>
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-100">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3">Method 1: Manual Input</h3>
                    <p className="text-slate-500 font-medium leading-relaxed mb-6">
                        Best for individual reports. Copy-paste specific cases, review granular findings organ-by-organ, and verify negation logic before saving.
                    </p>
                    <div className="flex items-center text-indigo-600 font-bold text-sm">
                        Start Individual Session <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                    </div>
                </button>

                {/* Method 2 Card */}
                <div className="group relative bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 text-left transition-all hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>
                    </div>
                    <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-100">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3">Method 2: Bulk Upload</h3>
                    <p className="text-slate-500 font-medium leading-relaxed mb-6">
                        Automated high-volume processing. Upload a CSV with up to 500 records. App processes all cases in the background and goes straight to Summary.
                    </p>
                    <div className="space-y-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center"
                        >
                            Upload CSV File
                        </button>
                        <button 
                            onClick={downloadTemplate}
                            className="w-full py-3 text-emerald-600 font-bold text-sm hover:bg-emerald-50 rounded-xl transition-all border border-emerald-100"
                        >
                            Download CSV Template
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".csv" 
                            onChange={handleFileUpload} 
                        />
                    </div>
                </div>
            </div>

            {/* Privacy Disclaimer */}
            <div className="max-w-3xl mx-auto p-6 bg-red-50 border-2 border-red-100 rounded-3xl">
                <p className="text-red-700 text-sm font-bold leading-relaxed text-center">
                    <span className="uppercase text-[10px] tracking-widest block mb-1 opacity-80">Privacy Notice</span>
                    This application does not store any patient information. It only helps extract complex text into a structured data format, and users must download the CSV file immediately after extraction. Please do not input or upload any sensitive data, such as real patient ID numbers.
                </p>
            </div>

            {error && <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-xl text-center font-bold">{error}</div>}
          </div>
        )}

        {/* INPUT: Manual Workflow */}
        {view === 'INPUT' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-6 duration-700">
             <button onClick={() => setView('LANDING')} className="mb-6 text-slate-400 font-bold flex items-center hover:text-indigo-600 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                Back to Selection
            </button>
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10">
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Manual Case Entry</h2>
                <p className="text-slate-500 mt-2 font-medium">Input clinical data for precise extraction.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Patient ID Key</label>
                    <input type="text" value={keyId} onChange={(e) => setKeyId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-bold text-indigo-700 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" placeholder="P-8821" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Order ID</label>
                    <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-bold text-indigo-700 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" placeholder="ORD-9901" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Radiology Report Text</label>
                  <textarea className="w-full h-72 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-base font-mono text-slate-700 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none" placeholder="Paste report text..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
                </div>
              </div>

              <div className="mt-8 flex space-x-4">
                <button onClick={() => { setKeyId('P-8821'); setOrderId('ORD-9901'); setInputText(EXAMPLE_REPORT); }} className="px-8 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-100">Demo</button>
                <button onClick={handleManualExtract} disabled={status === Status.LOADING} className="flex-grow py-5 px-10 rounded-2xl font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center space-x-4 transition-all">
                    {status === Status.LOADING ? <span>Processing...</span> : <span>Extract & Review Findings</span>}
                </button>
              </div>
              {error && <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
            </div>
          </div>
        )}

        {/* REVIEW: Manual Workflow Only */}
        {view === 'REVIEW' && currentExtraction && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-indigo-600 p-10 text-white flex justify-between items-end">
                    <div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">Granular Review</span>
                        <h2 className="text-3xl font-extrabold tracking-tight">Case: {keyId}</h2>
                    </div>
                </div>
                
                <div className="p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentExtraction.findings.map((f, i) => <FindingCard key={i} finding={f} />)}
                    </div>
                    {currentExtraction.impression && (
                        <div className="bg-slate-900 p-8 rounded-3xl"><p className="text-slate-100 font-bold text-sm leading-relaxed whitespace-pre-wrap">{currentExtraction.impression}</p></div>
                    )}
                </div>

                <div className="bg-slate-50 p-10 border-t border-slate-100 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <button onClick={saveAndNextManual} className="flex-grow py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all">Save & Continue Manual</button>
                    <button onClick={finishManual} className="px-10 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 shadow-lg active:scale-95 transition-all">Save & Go to Summary</button>
                </div>
            </div>
          </div>
        )}

        {/* SUMMARY: For Both Methods */}
        {view === 'SUMMARY' && <SummaryTable reports={history} onReset={resetAll} />}

      </main>

      {/* Batch Processing Overlay */}
      {status === Status.BATCH_PROCESSING && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                        <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={263.9} strokeDashoffset={263.9 - (263.9 * (batchProgress.current / batchProgress.total))} className="text-emerald-500 transition-all duration-300" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900">
                        {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                    </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Processing Batch...</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Extracting data for {batchProgress.current} of {batchProgress.total} reports. Do not close this window.</p>
                <div className="mt-8 flex justify-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-300"></div>
                </div>
            </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-extrabold mb-2 text-slate-900">Non-Radiology Content Detected</h3>
                <p className="text-slate-600 mb-8 leading-relaxed">No clinical text possible due to non-medical input text. Please ensure you are providing a valid radiological report text.</p>
                <button onClick={handleCloseWarning} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 hover:bg-indigo-700">Return to Input</button>
            </div>
        </div>
      )}

      <footer className="py-4 bg-white border-t border-slate-100 text-center">
          <p className="text-indigo-700 text-[10px] font-black uppercase tracking-[0.4em]">Idea × Implementation by Dr. Win Khaing | v0.3</p>
      </footer>
    </div>
  );
}

export default App;
