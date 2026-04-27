'use client';

import { useState } from 'react';
import { ShieldCheck, Play, Terminal, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuditPipeline() {
  const [targetUrl, setTargetUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    setIsRunning(true);
    setLogs(['Initializing Pipeline 5: Audit & Strategy...', `Target: ${targetUrl}`]);

    // Simulate pipeline run
    setTimeout(() => {
      setLogs(prev => [...prev, 'Fetching profile data...']);
    }, 1500);

    setTimeout(() => {
      setLogs(prev => [...prev, 'Analyzing 30 recent posts...']);
    }, 3000);

    setTimeout(() => {
      setLogs(prev => [...prev, 'Scoring hooks, formatting, and authority...']);
    }, 4500);

    setTimeout(() => {
      setLogs(prev => [...prev, 'Generating 30-day strategy...']);
    }, 6000);

    setTimeout(() => {
      setLogs(prev => [...prev, '✅ PDF Report Generated.']);
      setIsRunning(false);
      setTargetUrl('');
    }, 8000);
  };

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
          </div>
          LinkedIn Post & Profile Audit
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Automated scoring, post tear-downs, and content strategy generation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Config & Trigger */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>
            
            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Target LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  disabled={isRunning}
                  required
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-purple-500" defaultChecked />
                  Sync to Notion
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-purple-500" defaultChecked />
                  Generate PDF
                </label>
              </div>

              <button
                type="submit"
                disabled={isRunning || !targetUrl}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning 
                    ? 'bg-slate-800 cursor-not-allowed' 
                    : targetUrl 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Pipeline Running...' : 'Trigger Pipeline'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
             <h2 className="text-xl font-bold text-white mb-4">Recent Reports</h2>
             <div className="space-y-3">
               <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">Dr. Staci Moore</p>
                      <p className="text-xs text-slate-400">PDF Report • 2 hrs ago</p>
                    </div>
                 </div>
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">John Doe</p>
                      <p className="text-xs text-slate-400">PDF Report • 1 day ago</p>
                    </div>
                 </div>
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
               </div>
             </div>
          </div>
        </div>

        {/* Right Column: Terminal Output */}
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
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  key={i}
                  className={`flex gap-3 ${log.includes('✅') ? 'text-emerald-400' : 'text-slate-300'}`}
                >
                  <span className="text-slate-600 shrink-0">
                    {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                  <span>{log}</span>
                </motion.div>
              ))
            )}
            {isRunning && (
              <div className="flex gap-3 text-purple-400 items-center">
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
