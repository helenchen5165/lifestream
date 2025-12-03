import React from 'react';
import { CATEGORY_DEFINITIONS } from '../constants';
import { TimeEntry } from '../types';

interface TimeEntryListProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
}

export const TimeEntryList: React.FC<TimeEntryListProps> = ({ entries, onDelete }) => {
  // Sort by timestamp desc
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">记录明细</h3>
        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{entries.length} 条记录</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {sortedEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">暂无记录</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedEntries.map((entry) => {
              const category = CATEGORY_DEFINITIONS[entry.category];
              return (
                <div key={entry.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center min-w-[3rem]">
                       <span className="text-xs font-bold text-slate-400">{formatDate(entry.timestamp)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-white uppercase"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.label.split(' ')[0]}
                        </span>
                        <span className="font-medium text-slate-800">{entry.activity}</span>
                        {entry.notionPageId && (
                           <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1 flex items-center gap-1" title="已同步到 Notion">
                             <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Notion
                           </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{entry.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                      {Math.floor(entry.durationMinutes / 60) > 0 && `${Math.floor(entry.durationMinutes / 60)}h `}
                      {entry.durationMinutes % 60}m
                    </span>
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="删除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
