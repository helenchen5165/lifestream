import React, { useState, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { Dashboard } from './components/Dashboard';
import { TimeEntryList } from './components/TimeEntryList';
import { ReportSection } from './components/ReportSection';
import { NotionSettings } from './components/NotionSettings';
import { TimeEntry, NotionConfig } from './types';
import { syncEntryToNotion } from './services/notionService';
import { processEntriesWithGoals } from './services/goalsService';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  // Notion State
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const [notionConfig, setNotionConfig] = useState<NotionConfig | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check for API Key
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setApiKeyMissing(true);
    }

    // Load entries from local storage
    const savedEntries = localStorage.getItem('lifestream_entries');
    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries));
      } catch (e) {
        console.error("Failed to load entries", e);
      }
    }

    // Load Notion Config
    const savedConfig = localStorage.getItem('lifestream_notion_config');
    if (savedConfig) {
      try {
        setNotionConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to load notion config", e);
      }
    }
  }, []);

  useEffect(() => {
    // Save entries to local storage
    localStorage.setItem('lifestream_entries', JSON.stringify(entries));
  }, [entries]);

  const handleEntriesParsed = async (newEntries: TimeEntry[]) => {
    // Process entries with goal matching if Notion config is available
    let processedEntries = newEntries;
    if (notionConfig && notionConfig.goalsDatabaseId) {
      try {
        processedEntries = await processEntriesWithGoals(newEntries, notionConfig);
      } catch (error) {
        console.error('Error processing entries with goals:', error);
        // Continue with unmatched entries
      }
    }
    setEntries(prev => [...prev, ...processedEntries]);
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这条记录吗？")) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleClearAll = () => {
    if (confirm("确定要清空所有数据吗？此操作无法撤销。")) {
      setEntries([]);
      localStorage.removeItem('lifestream_entries');
    }
  };

  const handleSaveNotionConfig = (config: NotionConfig) => {
    setNotionConfig(config);
    localStorage.setItem('lifestream_notion_config', JSON.stringify(config));
  };

  const handleSyncToNotion = async () => {
    console.log('🔄 Starting Notion sync...');
    console.log('Notion Config:', {
      hasApiKey: !!notionConfig?.apiKey,
      recordsDatabaseId: notionConfig?.recordsDatabaseId,
      goalsDatabaseId: notionConfig?.goalsDatabaseId,
      proxyUrl: notionConfig?.proxyUrl
    });

    if (!notionConfig || !notionConfig.apiKey || !notionConfig.recordsDatabaseId) {
      console.error('❌ Notion configuration incomplete');
      alert('请先配置 Notion 设置（API Key 和 Records Database ID）');
      setIsNotionModalOpen(true);
      return;
    }

    const unsyncedEntries = entries.filter(e => !e.notionPageId);
    console.log(`📊 Found ${unsyncedEntries.length} unsynced entries`);

    if (unsyncedEntries.length === 0) {
      alert("所有记录已同步到 Notion！");
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    // Clone entries to update them locally
    let updatedEntries = [...entries];

    for (const entry of unsyncedEntries) {
      console.log(`⏳ Syncing entry: ${entry.task}`, entry);
      try {
        const pageId = await syncEntryToNotion(entry, notionConfig);
        console.log(`✅ Successfully synced: ${entry.task} (Page ID: ${pageId})`);
        // Update local entry with notion ID
        updatedEntries = updatedEntries.map(e =>
          e.id === entry.id ? { ...e, notionPageId: pageId } : e
        );
        successCount++;
        // Small delay to respect rate limits roughly (3 req/s limit usually)
        await new Promise(r => setTimeout(r, 400));
      } catch (error: any) {
        console.error(`❌ Failed to sync entry "${entry.task}":`, error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          entry: entry
        });
        failCount++;
        // If it's a CORS error, stop immediately to avoid spamming alerts
        if (error.message.includes("Network Error")) {
          alert(error.message);
          setIsSyncing(false);
          setEntries(updatedEntries); // Save progress so far
          return;
        }
      }
    }

    setEntries(updatedEntries);
    setIsSyncing(false);

    if (failCount > 0) {
      alert(`同步完成: ${successCount} 成功, ${failCount} 失败。请检查控制台获取详细错误。`);
    } else {
      alert(`成功同步 ${successCount} 条记录到 Notion！`);
    }
  };

  if (apiKeyMissing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="text-slate-600 mb-6">
            <code>process.env.API_KEY</code> is missing. Please add your Google Gemini API key to the environment variables to use this application.
          </p>
        </div>
      </div>
    );
  }

  const unsyncedCount = entries.filter(e => !e.notionPageId).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
              L
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 hidden sm:block">
              LifeStream AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSyncToNotion}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                unsyncedCount > 0 
                  ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              title="同步未保存的记录到 Notion"
            >
               {isSyncing ? (
                 <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
               )}
               <span className="hidden sm:inline">Sync Notion</span>
               {unsyncedCount > 0 && !isSyncing && (
                 <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{unsyncedCount}</span>
               )}
            </button>
            <button
              onClick={() => setIsNotionModalOpen(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Notion Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <button 
              onClick={handleClearAll}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              清空数据
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">你的时间去了哪里？</h2>
          <p className="text-slate-500">
            将时间视为 <span className="text-emerald-600 font-medium">投资</span>、
            <span className="text-indigo-600 font-medium">生产</span> 或 
            <span className="text-amber-500 font-medium">支出</span>。
            输入你的活动，让 AI 帮你分类和分析。
          </p>
        </div>

        {/* Input */}
        <InputSection 
          onEntriesParsed={handleEntriesParsed} 
          isLoading={isLoading} 
          setLoading={setIsLoading} 
        />

        {/* Dashboard */}
        <Dashboard entries={entries} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History List - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
             <TimeEntryList entries={entries} onDelete={handleDelete} />
          </div>

          {/* AI Report - Takes up 1 column on large screens */}
          <div className="lg:col-span-1">
            <ReportSection entries={entries} />
          </div>
        </div>
      </main>

      {/* Notion Settings Modal */}
      <NotionSettings 
        isOpen={isNotionModalOpen} 
        onClose={() => setIsNotionModalOpen(false)} 
        config={notionConfig}
        onSave={handleSaveNotionConfig}
      />
    </div>
  );
};

export default App;
