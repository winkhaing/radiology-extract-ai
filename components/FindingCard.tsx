
import React from 'react';
import { RadiologyFinding } from '../types';

interface FindingCardProps {
  finding: RadiologyFinding;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding }) => {
  const isAbnormal = finding.is_abnormal;
  
  // High contrast red for abnormal findings as requested
  const bgColor = isAbnormal ? 'bg-red-50' : 'bg-emerald-50';
  const borderColor = isAbnormal ? 'border-red-400' : 'border-emerald-400';
  const accentColor = isAbnormal ? 'bg-red-500' : 'bg-emerald-400';
  const textColor = isAbnormal ? 'text-red-700' : 'text-emerald-900';
  const subtextColor = isAbnormal ? 'text-red-600' : 'text-emerald-700';

  return (
    <div className={`p-4 rounded-xl border-l-4 ${bgColor} ${borderColor} shadow-sm transition-all hover:shadow-md mb-3`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2 mb-1">
             <span className={`w-2 h-2 rounded-full ${accentColor}`}></span>
             <h4 className={`font-bold text-sm ${textColor} uppercase tracking-wide`}>
                {finding.finding_label}
             </h4>
          </div>
          <p className={`text-sm ${subtextColor} leading-relaxed font-bold`}>
            {finding.finding_description}
          </p>
          {finding.details && (
            <p className="text-xs mt-2 text-slate-500 italic">
              Details: {finding.details}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end space-y-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isAbnormal ? 'bg-red-200 text-red-800' : 'bg-emerald-200 text-emerald-800'}`}>
                {isAbnormal ? 'Abnormal' : 'Normal'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${finding.present ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-700'}`}>
                {finding.present ? 'Present' : 'Absent'}
            </span>
        </div>
      </div>
    </div>
  );
};
