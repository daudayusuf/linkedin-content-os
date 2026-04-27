'use client';

import { useState } from 'react';
import { Activity, Play, Terminal, Users, UserPlus, MessageCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EngagementPipeline() {
  const [targetAccount, setTargetAccount] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;

    setIsRunning(true);
    setLogs([]); // clear old logs

    try {
      const response = await fetch('/api/pipelines/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAccount })
      });

      if (!response.body) throw new Error('No readable stream available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsRunning(false);
              setTargetAccount('');
              break;
            }
            try {
              const parsed = JSON.parse(data);
              setLogs(prev => [...prev, parsed.message]);
            } catch (err) {}
          }
        }
      }
    } catch (error) {
      setLogs(prev => [...prev, '❌ Failed to connect to backend server.']);
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Activity className="w-8 h-8 text-emerald-400" />
          </div>
          Pipeline 3: Engagement Sessions
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Automate scraping target accounts and drafting personalized connection requests & comments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>
            
            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Target Audience / Search URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. CMOs in Tech Startups, or Sales Navigator URL"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  disabled={isRunning}
                  required
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-emerald-500" defaultChecked />
                  Email Final Report
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-emerald-500" defaultChecked />
                  Sync to Notion CRM
                </label>
              </div>

              <button
                type="submit"
                disabled={isRunning || !targetAccount}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning 
                    ? 'bg-slate-800 cursor-not-allowed' 
                    : targetAccount 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Building Plan...' : 'Run Engagement Plan'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
               <UserPlus className="w-8 h-8 text-emerald-400 mb-2" />
               <span className="text-2xl font-bold text-white">45</span>
               <span className="text-xs text-slate-400">Connection Notes Drafted</span>
             </div>
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
               <MessageCircle className="w-8 h-8 text-emerald-400 mb-2" />
               <span className="text-2xl font-bold text-white">112</span>
               <span className="text-xs text-slate-400">Comments Drafted</span>
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
              <div className="flex gap-3 text-emerald-400 items-center">
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
