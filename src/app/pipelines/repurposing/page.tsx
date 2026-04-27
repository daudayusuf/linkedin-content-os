'use client';

import { useState } from 'react';
import { RefreshCcw, Play, Terminal, Video, FileText, LayoutTemplate } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RepurposingPipeline() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl) return;

    setIsRunning(true);
    setLogs(['Initializing Pipeline 4: Content Repurposing...', `Source URL: ${sourceUrl}`]);

    setTimeout(() => setLogs(prev => [...prev, 'Downloading transcript / text content...']), 1500);
    setTimeout(() => setLogs(prev => [...prev, 'Extracting key takeaways and quotes...']), 3500);
    setTimeout(() => setLogs(prev => [...prev, 'Generating LinkedIn text post format...']), 5000);
    setTimeout(() => setLogs(prev => [...prev, 'Generating Carousel slide text content...']), 6500);
    setTimeout(() => {
      setLogs(prev => [...prev, '✅ Content successfully repurposed into 3 formats.']);
      setIsRunning(false);
      setSourceUrl('');
    }, 8500);
  };

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-rose-500/20 rounded-lg">
            <RefreshCcw className="w-8 h-8 text-rose-400" />
          </div>
          Pipeline 4: Repurposing
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Turn long-form videos, podcasts, and articles into viral LinkedIn text posts and carousels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>
            
            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Source Content URL
                </label>
                <div className="relative">
                  <Video className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="url"
                    placeholder="YouTube URL, Blog Post URL, or Podcast link"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    disabled={isRunning}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-rose-500" defaultChecked />
                  <FileText className="w-4 h-4" /> Text Post
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-rose-500" defaultChecked />
                  <LayoutTemplate className="w-4 h-4" /> Carousel Copy
                </label>
              </div>

              <button
                type="submit"
                disabled={isRunning || !sourceUrl}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning 
                    ? 'bg-slate-800 cursor-not-allowed' 
                    : sourceUrl 
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Extracting Content...' : 'Start Repurposing'}
              </button>
            </form>
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
              <div className="flex gap-3 text-rose-400 items-center">
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
