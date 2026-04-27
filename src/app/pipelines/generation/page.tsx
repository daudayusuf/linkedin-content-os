'use client';

import { useState } from 'react';
import { MessageSquare, Play, Terminal, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GenerationPipeline() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional & Authoritative');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setIsRunning(true);
    setLogs(['Initializing Pipeline 2: Post Generation...', `Topic: ${topic}`, `Tone: ${tone}`]);

    setTimeout(() => setLogs(prev => [...prev, 'Drafting initial content with Gemini 1.5 Pro...']), 1500);
    setTimeout(() => setLogs(prev => [...prev, 'Applying formatting rules (line breaks, bullet points)...']), 3500);
    setTimeout(() => setLogs(prev => [...prev, 'Review Agent: Checking against blacklisted words...']), 5000);
    setTimeout(() => setLogs(prev => [...prev, 'Review Agent: Flagged "delve", rewriting sentence...']), 6000);
    setTimeout(() => {
      setLogs(prev => [...prev, '✅ Final Post Drafted. Saved to Notion Drafts.']);
      setIsRunning(false);
      setTopic('');
    }, 8500);
  };

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <MessageSquare className="w-8 h-8 text-blue-400" />
          </div>
          Pipeline 2: Post Generation
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Transform rough ideas into high-converting, perfectly formatted LinkedIn posts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>
            
            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Topic / Rough Concept
                </label>
                <textarea
                  placeholder="e.g. Talk about how important it is to have a structured onboarding process for new hires..."
                  className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isRunning}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Brand Voice / Tone
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={isRunning}
                >
                  <option>Professional & Authoritative</option>
                  <option>Controversial / Unpopular Opinion</option>
                  <option>Storytelling / Vulnerable</option>
                  <option>Actionable Step-by-Step</option>
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-blue-500" defaultChecked />
                  Enforce Blacklist (Review Agent)
                </label>
              </div>

              <button
                type="submit"
                disabled={isRunning || !topic}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning 
                    ? 'bg-slate-800 cursor-not-allowed' 
                    : topic 
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Generating Post...' : 'Generate Post'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
             <h2 className="text-xl font-bold text-white mb-4">Recent Drafts</h2>
             <div className="space-y-3">
               <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">Onboarding Process Framework</p>
                      <p className="text-xs text-slate-400">Actionable • Sent to Notion</p>
                    </div>
                 </div>
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className={`flex gap-3 ${log.includes('✅') ? 'text-emerald-400' : log.includes('Review Agent') ? 'text-amber-400' : 'text-slate-300'}`}>
                  <span className="text-slate-600 shrink-0">
                    {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                  <span>{log}</span>
                </motion.div>
              ))
            )}
            {isRunning && (
              <div className="flex gap-3 text-blue-400 items-center">
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
