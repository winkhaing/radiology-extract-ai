
import React, { useState } from 'react';
import { Header } from './components/Header';
import { FindingCard } from './components/FindingCard';
import { SummaryTable } from './components/SummaryTable';
import { extractRadiologyData } from './geminiService';
import { ExtractionResult, Status, SessionReport, AppView } from './types';

const EXAMPLE_REPORT = `CHEST X-RAY PA/LATERAL
Lungs: Focal consolidation in RLL. Heart size is normal.
Impression: RLL Pneumonia.`;

function App() {
  const [inputText, setInputText] = useState('');
  const [keyId, setKeyId] = useState('');
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [currentExtraction, setCurrentExtraction] = useState<ExtractionResult | null>(null);
  const [history, setHistory] = useState<SessionReport[]>([]);
  const [view, setView] = useState<AppView>('INPUT');
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!keyId.trim()) {
      setError("Please provide a Key ID (e.g., MRN or Accession Number) first.");
      return;
    }
    if (!inputText.trim()) {
      setError("Please provide report text to extract.");
      return;
    }

    setStatus(Status.LOADING);
    setError(null);
    try {
      const data = await extractRadiologyData(inputText);
      setCurrentExtraction(data);
      setStatus(Status.SUCCESS);
      setView('REVIEW');
    } catch (err) {
      console.error(err);
      setError("Extraction failed. Please check your connectivity and report format.");
      setStatus(Status.ERROR);
    }
  };

  const saveAndNext = () => {
    if (currentExtraction) {
      const newReport: SessionReport = {
        id: crypto.randomUUID(),
        keyId: keyId,
        timestamp: new Date().toLocaleString(),
        rawText: inputText,
        extraction: currentExtraction
      };
      setHistory(prev => [...prev, newReport]);
      // Reset for next
      setInputText('');
      setKeyId('');
      setCurrentExtraction(null);
      setStatus(Status.IDLE);
      setView('INPUT');
    }
  };

  const finishSession = () => {
    if (currentExtraction) {
      const newReport: SessionReport = {
        id: crypto.randomUUID(),
        keyId: keyId,
        timestamp: new Date().toLocaleString(),
        rawText: inputText,
        extraction: currentExtraction
      };
      setHistory(prev => [...prev, newReport]);
    }
    setView('SUMMARY');
  };

  const resetAll = () => {
    if (window.confirm("Are you sure you want to clear this session? All unsaved data will be lost.")) {
      setHistory([]);
      setView('INPUT');
      setInputText('');
      setKeyId('');
      setCurrentExtraction(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        
        {/* Workflow Progress Tracker */}
        <div className="mb-8 flex justify-center">
            <div className="flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.2em]">
                <div className={`flex items-center space-x-2 ${view === 'INPUT' ? 'text-indigo-600' : 'text-slate-300'}`}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${view === 'INPUT' ? 'border-indigo-600 bg-white shadow-lg shadow-indigo-100' : 'border-slate-200 bg-slate-50'}`}>01</span>
                    <span>Input</span>
                </div>
                <div className="w-12 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center space-x-2 ${view === 'REVIEW' ? 'text-indigo-600' : 'text-slate-300'}`}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${view === 'REVIEW' ? 'border-indigo-600 bg-white shadow-lg shadow-indigo-100' : 'border-slate-200 bg-slate-50'}`}>02</span>
                    <span>Review</span>
                </div>
                <div className="w-12 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center space-x-2 ${view === 'SUMMARY' ? 'text-indigo-600' : 'text-slate-300'}`}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${view === 'SUMMARY' ? 'border-indigo-600 bg-white shadow-lg shadow-indigo-100' : 'border-slate-200 bg-slate-50'}`}>03</span>
                    <span>Summary</span>
                </div>
            </div>
        </div>

        {view === 'INPUT' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10">
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Report Intake</h2>
                <p className="text-slate-500 mt-2 font-medium">Step 1: Link identifying data and provide report text.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Key ID Variable (e.g. Accession/MRN)</label>
                  <input 
                    type="text"
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-bold text-indigo-700 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Enter unique Identifier..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Complicated Report Text</label>
                  <textarea
                    className="w-full h-72 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-base font-mono text-slate-700 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all resize-none"
                    placeholder="Paste the complicated free-text here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <button
                    onClick={() => { setKeyId('EX-10023'); setInputText(EXAMPLE_REPORT); }}
                    className="px-8 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100"
                >
                    Load Demo
                </button>
                <button
                    onClick={handleExtract}
                    disabled={status === Status.LOADING}
                    className="flex-grow py-5 px-10 rounded-2xl font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center space-x-4 transition-all active:scale-95"
                >
                    {status === Status.LOADING ? (
                        <>
                            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Synthesizing Data...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>Perform Extraction</span>
                        </>
                    )}
                </button>
              </div>

              {error && (
                <div className="mt-8 p-5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center shadow-sm">
                    <svg className="w-6 h-6 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'REVIEW' && currentExtraction && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-indigo-600 p-10 text-white flex justify-between items-end">
                    <div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">Extraction Review</span>
                        <h2 className="text-3xl font-extrabold tracking-tight">Report: {keyId}</h2>
                    </div>
                    <div className="text-right">
                         <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Automated QC Active</span>
                    </div>
                </div>
                
                <div className="p-10 space-y-10">
                    {currentExtraction.patient_summary && (
                        <div>
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Patient Profile Summary</h4>
                            <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100/50">
                                <p className="text-indigo-950 font-semibold leading-relaxed">{currentExtraction.patient_summary}</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Granular Organ Findings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentExtraction.findings.map((f, i) => (
                                <FindingCard key={i} finding={f} />
                            ))}
                        </div>
                    </div>

                    {currentExtraction.impression && (
                        <div>
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Final Clinical Impression</h4>
                            <div className="bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200">
                                <p className="text-slate-100 font-bold text-sm leading-relaxed whitespace-pre-wrap">{currentExtraction.impression}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-10 border-t border-slate-100 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <button
                        onClick={saveAndNext}
                        className="flex-grow py-5 px-10 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-95"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Save & Input Next Report
                    </button>
                    <button
                        onClick={finishSession}
                        className="flex-grow py-5 px-10 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center active:scale-95 shadow-lg shadow-slate-200"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Finish & Export Data
                    </button>
                </div>
            </div>
          </div>
        )}

        {view === 'SUMMARY' && (
          <SummaryTable reports={history} onReset={resetAll} />
        )}

      </main>

      <footer className="py-10 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">Proprietary Diagnostic Extraction Engine &bull; Batch v2.4</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
