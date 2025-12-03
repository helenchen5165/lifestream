import React, { useState } from 'react';
import { NotionConfig } from '../types';

interface NotionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: NotionConfig | null;
  onSave: (config: NotionConfig) => void;
}

export const NotionSettings: React.FC<NotionSettingsProps> = ({ isOpen, onClose, config, onSave }) => {
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [recordsDatabaseId, setRecordsDatabaseId] = useState(config?.recordsDatabaseId || '');
  const [goalsDatabaseId, setGoalsDatabaseId] = useState(config?.goalsDatabaseId || '');
  const [proxyUrl, setProxyUrl] = useState(config?.proxyUrl || '');

  // Check if proxy URL is set in environment (production mode)
  const hasEnvProxy = !!import.meta.env.VITE_NOTION_PROXY_URL;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ apiKey, recordsDatabaseId, goalsDatabaseId, proxyUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-2xl">📝</span> Notion 同步设置
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notion Integration Token (API Key)</label>
              <input
                type="password"
                required
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="secret_..."
              />
              <p className="text-xs text-slate-500 mt-1">在 <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Notion Integrations</a> 页面创建。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Records Database ID</label>
              <input
                type="text"
                required
                value={recordsDatabaseId}
                onChange={e => setRecordsDatabaseId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                placeholder="29c325e9f72480bea795cb6d7bfcbad1"
              />
              <p className="text-xs text-slate-500 mt-1">时间记录数据库 (Records Database)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Goals Database ID</label>
              <input
                type="text"
                required
                value={goalsDatabaseId}
                onChange={e => setGoalsDatabaseId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                placeholder="29c325e9f724804f9ff0e0dcd7bf4d6b"
              />
              <p className="text-xs text-slate-500 mt-1">目标数据库 (Goals Database) - 用于自动匹配Goal</p>
            </div>

            {!hasEnvProxy && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CORS Proxy URL (可选)</label>
                <input
                  type="text"
                  value={proxyUrl}
                  onChange={e => setProxyUrl(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-xs"
                  placeholder="https://cors-anywhere.herokuapp.com/ (留空以尝试直连)"
                />
                <p className="text-[10px] text-amber-600 mt-1">
                  注意：浏览器会拦截直接的 Notion API 请求。您可能需要配置代理或在开发环境使用允许跨域的插件。
                </p>
              </div>
            )}

            {hasEnvProxy && (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700">
                  ✅ CORS 代理已配置：使用系统默认代理服务器
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-xs text-slate-600">
            <h4 className="font-semibold mb-2">Records Database 必需字段：</h4>
            <ul className="list-disc pl-4 space-y-1 mb-3">
              <li><strong>Task</strong> (Title): 任务描述</li>
              <li><strong>Duration (Minutes)</strong> (Number): 时长</li>
              <li><strong>Start Time</strong> (Date): 开始时间</li>
              <li><strong>End Time</strong> (Date): 结束时间</li>
              <li><strong>支出项</strong> (Select): 活动类型</li>
              <li><strong>性质</strong> (Formula): 自动计算类别</li>
              <li><strong>Goal</strong> (Relation): 关联Goals数据库</li>
            </ul>
            <h4 className="font-semibold mb-2">Goals Database 必需字段：</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Goal Title</strong> (Title): 目标标题</li>
              <li><strong>Status</strong> (Status): 状态</li>
              <li><strong>Deadline</strong> (Date): 截止日期</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors text-sm font-medium"
            >
              保存配置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
