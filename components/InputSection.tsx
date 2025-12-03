import React, { useState } from 'react';
import { parseNaturalLanguageInput } from '../services/geminiService';
import { TimeEntry } from '../types';

interface InputSectionProps {
  onEntriesParsed: (entries: TimeEntry[]) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ onEntriesParsed, isLoading, setLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      const entries = await parseNaturalLanguageInput(input);
      onEntriesParsed(entries);
      setInput('');
    } catch (error) {
      console.error("Failed to parse input", error);
      alert("AI 解析失败，请重试 (请检查 API Key)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-slate-100">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        记录时间
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            className="w-full p-4 pr-12 text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all bg-slate-50 h-32"
            placeholder="告诉我你做了什么？例如：'上午写了3小时代码，中午睡了半小时，下午去健身房运动了2小时'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`absolute bottom-3 right-3 px-4 py-2 rounded-lg text-white font-medium transition-all ${
              isLoading || !input.trim() 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                分析中...
              </span>
            ) : (
              'AI 记录'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};