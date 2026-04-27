'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Play, Terminal, FileText, ExternalLink, Mail } from 'lucide-react';
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

export default function AuditPipeline() {
  const [targetUrl, setTargetUrl] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{text: string, time: string}[]>([]);
  const [records, setRecords] = useState<NotionRecord[]>([]);

  const fetchRecords = () =>
    fetch('/api/notion/records?type=audit&limit=5')
      .then(r => r.json()).then(setRecords).catch(() => {});

  useEffect(() => { fetchRecords(); }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    setIsRunning(true);
    setLogs([]);

    try {
      const response = await fetch('/api/pipelines/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, prospectEmail: prospectEmail || undefined })
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
              setTargetUrl('');
              setProspectEmail('');
              fetchRecords();
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
              setLogs(prev => [...prev, { text: parsed.message, time: timeStr }]);
            } catch (err) {}
          }
        }
      }
    } catch (error) {
      const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      setLogs(prev => [...prev, { text: '❌ Failed to connect to backend server.', time: timeStr }]);
      setIsRunning(false);
    }
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

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Send Report to (optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="prospect@email.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    value={prospectEmail}
                    onChange={(e) => setProspectEmail(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
                {prospectEmail && (
                  <p className="text-xs text-purple-400 mt-1.5">Report will be emailed when pipeline completes</p>
                )}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-not-allowed">
                  <input type="checkbox" checked disabled onChange={() => {}} className="rounded bg-slate-800 border-slate-700 text-purple-500 cursor-not-allowed opacity-60" />
                  Sync to Notion
                  <span className="text-xs text-slate-500">(Always on)</span>
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
               {records.length === 0 ? (
                 <p className="text-slate-500 text-sm">No audits saved yet. Run your first audit above.</p>
               ) : records.map(r => (
                 <a key={r.id} href={r.notionUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors group">
                   <div className="flex items-center gap-3">
                     <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                     <div>
                       <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">{r.title}</p>
                       <p className="text-xs text-slate-400">{r.subtitle} · {timeAgo(r.createdAt)}</p>
                     </div>
                   </div>
                   <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                 </a>
               ))}
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
                  className={`flex gap-3 ${log.text.includes('✅') ? 'text-emerald-400' : 'text-slate-300'}`}
                >
                  <span className="text-slate-600 shrink-0">
                    {log.time}
                  </span>
                  <span>{log.text}</span>
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
