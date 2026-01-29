
import React from 'react';
import { SessionReport, RadiologyFinding } from '../types';

interface SummaryTableProps {
  reports: SessionReport[];
  onReset: () => void;
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ reports, onReset }) => {
  // Extract all unique organ names to serve as columns
  const allOrgans = Array.from(
    new Set(
      reports.flatMap(r => r.extraction.findings.map(f => f.organ))
    )
  ).sort();

  const handleExportExcel = () => {
    // CSV headers starting with Key ID
    const headers = ['Key ID', 'Timestamp', 'Raw Report', 'Impression', ...allOrgans];
    
    const rows = reports.map(r => {
      const organData = allOrgans.map(organ => {
        const findings = r.extraction.findings.filter(f => f.organ === organ);
        return findings.map(f => {
            const abnormalTag = f.is_abnormal ? '[ABNORMAL]' : '[NORMAL]';
            return `${abnormalTag} ${f.finding_label}: ${f.finding_description}`;
        }).join(' | ');
      });
      
      return [
        `"${r.keyId.replace(/"/g, '""')}"`,
        `"${r.timestamp}"`,
        `"${r.rawText.replace(/"/g, '""')}"`,
        `"${(r.extraction.impression || '').replace(/"/g, '""')}"`,
        ...organData.map(d => `"${d.replace(/"/g, '""')}"`)
      ];
    });

    // Excel-friendly CSV: Add UTF-8 BOM (\uFEFF) so Excel opens it with correct encoding
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `radiology_data_export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Final Session Archive</h2>
          <p className="text-sm text-slate-500">Structured data for {reports.length} patient reports.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onReset}
            className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
          >
            Clear & New Session
          </button>
          <button
            onClick={handleExportExcel}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center transition-all active:scale-95"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export to Excel (.csv)
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Key ID</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Impression</th>
                {allOrgans.map(organ => (
                  <th key={organ} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[250px] border-l border-slate-200">
                    {organ}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 text-sm font-bold text-indigo-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200">
                    {report.keyId}
                  </td>
                  <td className="p-4 text-sm text-slate-700 align-top max-w-[300px]">
                    <div className="line-clamp-4 text-xs leading-relaxed">
                        {report.extraction.impression}
                    </div>
                  </td>
                  {allOrgans.map(organ => {
                    const findings = report.extraction.findings.filter(f => f.organ === organ);
                    return (
                      <td key={organ} className="p-4 align-top border-l border-slate-100">
                        {findings.length === 0 ? (
                          <span className="text-slate-300 italic text-[10px]">No data</span>
                        ) : (
                          <div className="space-y-2">
                            {findings.map((f, i) => (
                              <div key={i} className={`p-2 rounded text-[11px] leading-tight border ${f.is_abnormal ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
                                <div className="font-bold mb-0.5">{f.finding_label}</div>
                                <div>{f.finding_description}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
