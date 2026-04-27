'use client';

import { useState, useEffect } from 'react';
import { PenTool, Play, Terminal, Lightbulb, Search, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface NotionRecord { id: string; title: string; subtitle: string; notionUrl: string; createdAt: string; }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function IdeationPipeline() {
  const [niche, setNiche] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [records, setRecords] = useState<NotionRecord[]>([]);

  const fetchRecords = () =>
    fetch('/api/notion/records?type=ideation&limit=5')
      .then(r => r.json()).then(setRecords).catch(() => {});

  useEffect(() => { fetchRecords(); }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche) return;

    setIsRunning(true);
    setLogs([]);

    try {
      const response = await fetch('/api/pipelines/ideation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche }),
      });

      if (!response.body) throw new Error('No readable stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') { setIsRunning(false); setNiche(''); fetchRecords(); break; }
          try {
            const { message } = JSON.parse(data);
            const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLogs(prev => [...prev, `[${time}] ${message}`]);
          } catch {}
        }
      }
    } catch {
      setLogs(prev => [...prev, '❌ Failed to connect to backend.']);
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <PenTool className="w-8 h-8 text-amber-400" />
          </div>
          Pipeline 1: Content Ideation
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Scrape industry news and Perplexity to generate highly-engaging post concepts and hooks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>
            
            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Target Niche / Industry
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. AI in Healthcare, B2B SaaS Growth"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    disabled={isRunning}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-not-allowed">
                  <input type="checkbox" checked disabled onChange={() => {}} className="rounded bg-slate-800 border-slate-700 text-amber-500 cursor-not-allowed opacity-60" />
                  Sync to Notion Kanban
                  <span className="text-xs text-slate-500">(Always on)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isRunning || !niche}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning 
                    ? 'bg-slate-800 cursor-not-allowed' 
                    : niche 
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Brainstorming...' : 'Run Ideation'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
             <h2 className="text-xl font-bold text-white mb-4">Recent Ideas Generated</h2>
             <div className="space-y-3">
               {records.length === 0 ? (
                 <p className="text-slate-500 text-sm">No ideation sessions yet. Run your first above.</p>
               ) : records.map(r => (
                 <a key={r.id} href={r.notionUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors group">
                   <div className="flex items-start gap-3">
                     <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                     <div>
                       <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">{r.title}</p>
                       <p className="text-xs text-slate-400 mt-0.5">{r.subtitle} · {timeAgo(r.createdAt)}</p>
                     </div>
                   </div>
                   <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0 ml-2" />
                 </a>
               ))}
             </div>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-[#0c0c0c] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Execution Logs</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
          </div>
          <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
            {!isRunning && logs.length === 0 ? (
              <p className="text-slate-600">Waiting for pipeline trigger...</p>
            ) : (
              logs.map((log, i) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className={`flex gap-3 ${log.includes('✅') ? 'text-emerald-400' : 'text-slate-300'}`}>
                  <span className="text-slate-600 shrink-0">
                    {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                  <span>{log}</span>
                </motion.div>
              ))
            )}
            {isRunning && (
              <div className="flex gap-3 text-amber-400 items-center">
                <span className="text-slate-600 shrink-0">
                  {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </span>
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
