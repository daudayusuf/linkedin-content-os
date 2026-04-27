'use client';

import { useState } from 'react';
import { PenTool, Play, Terminal, Lightbulb, Search, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IdeationPipeline() {
  const [niche, setNiche] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche) return;

    setIsRunning(true);
    setLogs(['Initializing Pipeline 1: Content Ideation...', `Target Niche: ${niche}`]);

    setTimeout(() => setLogs(prev => [...prev, 'Connecting to Perplexity API for trends...']), 1500);
    setTimeout(() => setLogs(prev => [...prev, 'Analyzing recent highly-engaged posts in niche...']), 3000);
    setTimeout(() => setLogs(prev => [...prev, 'Generating 10 viral hook ideas...']), 4500);
    setTimeout(() => {
      setLogs(prev => [...prev, '✅ Ideation complete. Results synced to Notion.']);
      setIsRunning(false);
      setNiche('');
    }, 6500);
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
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-amber-500" defaultChecked />
                  Sync to Notion Kanban
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
               <div className="flex items-start justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer group">
                 <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">Why 90% of B2B SaaS cold emails fail (and the 1 framework to fix it)</p>
                      <p className="text-xs text-slate-400 mt-1">Hook Idea • 5 hrs ago</p>
                    </div>
                 </div>
               </div>
               <div className="flex items-start justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer group">
                 <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">The death of the 'spray and pray' SDR approach.</p>
                      <p className="text-xs text-slate-400 mt-1">Story Concept • 1 day ago</p>
                    </div>
                 </div>
               </div>
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
