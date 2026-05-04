'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Play, TrendingUp, Users, ShieldAlert } from 'lucide-react';
import { usePipelineRunner } from '@/lib/use-pipeline-runner';
import { PipelineTerminal } from '@/components/PipelineTerminal';

export default function ResearchPipeline() {
  const [niche, setNiche] = useState('');
  const [icpSummary, setIcpSummary] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [outputCount, setOutputCount] = useState(0);

  const {
    logs, status, runId,
    startRun, handleStatusChange, handleDirective, resetRun,
  } = usePipelineRunner();

  const isRunning = status === 'running' || status === 'paused';

  const fetchCount = () =>
    fetch('/api/notion/records?type=research&limit=100')
      .then((r) => r.json())
      .then((d) => setOutputCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});

  useEffect(() => { fetchCount(); }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !icpSummary) return;
    await startRun('/api/pipelines/research', {
      niche,
      icpSummary,
      competitors: competitors.split(',').map((c) => c.trim()).filter(Boolean),
    }, { onComplete: fetchCount });
  };

  const handleRestart = useCallback(() => {
    resetRun();
  }, [resetRun]);

  const canRun = niche.trim() && icpSummary.trim() && !isRunning;

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Search className="w-8 h-8 text-amber-400" />
          </div>
          Pipeline 1: Market, Audience &amp; Competitor Research
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Deep-dive your market landscape, ICP, and top competitors. Outputs feed every downstream pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>

            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Target Niche / Industry <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. B2B SaaS, Executive Coaching, Fintech Startups"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  disabled={isRunning}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  ICP Summary <span className="text-amber-500">*</span>
                </label>
                <textarea
                  placeholder="e.g. VP of Sales at B2B SaaS companies (50-500 employees), focused on pipeline growth, aged 35-50, active on LinkedIn..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                  value={icpSummary}
                  onChange={(e) => setIcpSummary(e.target.value)}
                  disabled={isRunning}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Key Competitors <span className="text-slate-500 text-xs">(optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Justin Welsh, Lara Acosta, Matt Barker"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  disabled={isRunning}
                />
              </div>

              <button
                type="submit"
                disabled={!canRun}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning
                    ? 'bg-slate-800 cursor-not-allowed'
                    : canRun
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-lg shadow-amber-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Running Research...' : 'Run Research Pipeline'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-7 h-7 text-amber-400 mb-2" />
              <span className="text-xs text-slate-400">Market</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <Users className="w-7 h-7 text-amber-400 mb-2" />
              <span className="text-xs text-slate-400">Audience</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <ShieldAlert className="w-7 h-7 text-amber-400 mb-2" />
              <span className="text-xs text-slate-400">Competitor</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Estimated runtime: 3–6 minutes · Results saved to Notion
          </p>
        </div>

        {/* Terminal with task controls */}
        <PipelineTerminal
          logs={logs}
          runId={runId}
          status={status}
          accentColor="amber"
          onStatusChange={handleStatusChange}
          onRestart={handleRestart}
          onDirective={handleDirective}
        />
      </div>
    </div>
  );
}
