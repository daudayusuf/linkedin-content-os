'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Play, UserPlus, MessageCircle } from 'lucide-react';
import { usePipelineRunner } from '@/lib/use-pipeline-runner';
import { PipelineTerminal } from '@/components/PipelineTerminal';

export default function EngagementPipeline() {
  const [targetAccount, setTargetAccount] = useState('');
  const [counts, setCounts] = useState({ notes: 0, comments: 0 });

  const {
    logs, status, runId,
    startRun, handleStatusChange, handleDirective, resetRun,
  } = usePipelineRunner();

  const isRunning = status === 'running' || status === 'paused';

  const fetchCounts = () =>
    fetch('/api/notion/records?type=engagement-counts')
      .then(r => r.json())
      .then((d) => setCounts({ notes: d.notes ?? 0, comments: d.comments ?? 0 }))
      .catch(() => {});

  useEffect(() => { fetchCounts(); }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;
    await startRun('/api/pipelines/engagement', { targetAccount }, {
      onComplete: () => {
        setTargetAccount('');
        fetchCounts();
      },
    });
  };

  const handleRestart = useCallback(() => {
    resetRun();
  }, [resetRun]);

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Activity className="w-8 h-8 text-emerald-400" />
          </div>
          Pipeline 3b: Engagement Session Plans & Writing
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
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-not-allowed">
                  <input type="checkbox" checked disabled onChange={() => {}} className="rounded bg-slate-800 border-slate-700 text-emerald-500 cursor-not-allowed opacity-60" />
                  Sync to Notion CRM
                  <span className="text-xs text-slate-500">(Always on)</span>
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
               <span className="text-2xl font-bold text-white">{counts.notes}</span>
               <span className="text-xs text-slate-400">Connection Notes Drafted</span>
             </div>
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
               <MessageCircle className="w-8 h-8 text-emerald-400 mb-2" />
               <span className="text-2xl font-bold text-white">{counts.comments}</span>
               <span className="text-xs text-slate-400">Comments Drafted</span>
             </div>
          </div>
        </div>

        {/* Terminal with task controls */}
        <PipelineTerminal
          logs={logs}
          runId={runId}
          status={status}
          accentColor="emerald"
          onStatusChange={handleStatusChange}
          onRestart={handleRestart}
          onDirective={handleDirective}
        />
      </div>
    </div>
  );
}
