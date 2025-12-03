import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateAiReport } from '../services/geminiService';
import { Period, TimeEntry } from '../types';

interface ReportSectionProps {
  entries: TimeEntry[];
}

export const ReportSection: React.FC<ReportSectionProps> = ({ entries }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>(Period.WEEK);

  const handleGenerateReport = async () => {
    if (entries.length === 0) {
      alert("没有足够的数据生成报告");
      return;
    }

    setLoading(true);
    setReport(null);
    try {
      // Filter entries based on period (Simple implementation: just takes all for now, or last 7/30 days)
      const now = new Date();
      let cutoff = new Date();
      
      if (period === Period.WEEK) cutoff.setDate(now.getDate() - 7);
      if (period === Period.MONTH) cutoff.setMonth(now.getMonth() - 1);
      if (period === Period.QUARTER) cutoff.setMonth(now.getMonth() - 3);

      const filteredEntries = entries.filter(e => e.timestamp >= cutoff.getTime());

      if (filteredEntries.length === 0) {
        alert("该时间段内没有记录");
        setLoading(false);
        return;
      }

      const result = await generateAiReport(filteredEntries, period);
      setReport(result);
    } catch (e) {
      console.error(e);
      alert("生成报告失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          AI 智能分析
        </h3>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {(Object.values(Period) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                period === p ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === Period.WEEK && '周报'}
              {p === Period.MONTH && '月报'}
              {p === Period.QUARTER && '季报'}
            </button>
          ))}
        </div>
      </div>

      {!report && !loading && (
         <div className="text-center py-8">
           <p className="text-slate-500 mb-4 text-sm">选择时间段并生成基于投资/支出/生产哲学的深度分析。</p>
           <button
             onClick={handleGenerateReport}
             className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors font-medium text-sm"
           >
             生成分析报告
           </button>
         </div>
      )}

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <svg className="animate-spin h-8 w-8 text-indigo-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="animate-pulse text-sm">AI 正在深度思考您的时间分配...</p>
        </div>
      )}

      {report && (
        <div className="prose prose-sm prose-slate max-w-none bg-slate-50 p-6 rounded-lg border border-slate-200">
           <ReactMarkdown>{report}</ReactMarkdown>
           <button 
             onClick={() => setReport(null)}
             className="mt-6 text-xs text-slate-400 hover:text-slate-600 underline"
           >
             清除报告
           </button>
        </div>
      )}
    </div>
  );
};