'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Play, FileText, Info } from 'lucide-react';
import { usePipelineRunner } from '@/lib/use-pipeline-runner';
import { PipelineTerminal } from '@/components/PipelineTerminal';

function defaultMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CalendarPipeline() {
  const [month, setMonth] = useState(defaultMonth);
  const [postCount, setPostCount] = useState(0);

  const {
    logs, status, runId,
    startRun, handleStatusChange, handleDirective, resetRun,
  } = usePipelineRunner();

  const isRunning = status === 'running' || status === 'paused';

  const fetchCount = () =>
    fetch('/api/notion/records?type=generation&limit=100')
      .then((r) => r.json())
      .then((d) => setPostCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});

  useEffect(() => { fetchCount(); }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    await startRun('/api/pipelines/calendar', { month }, {
      onComplete: fetchCount,
    });
  };

  const handleRestart = useCallback(() => {
    resetRun();
  }, [resetRun]);

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          Pipeline 3: Content Calendar, Planning &amp; Writing
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Converts your content strategy into a complete, publication-ready 30-day LinkedIn calendar — every post fully written.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                Reads your latest content strategy from Notion (Pipeline 2). Run Pipelines 1 → 2 first for the richest calendar output.
              </p>
            </div>

            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Target Month <span className="text-blue-500">*</span>
                </label>
                <input
                  type="month"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  disabled={isRunning}
                  required
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Posts scheduled Tue / Thu / Fri / Sat. Approx 18–22 posts per month.
                </p>
              </div>

              <button
                type="submit"
                disabled={isRunning || !month}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning
                    ? 'bg-slate-800 cursor-not-allowed'
                    : month
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Generating Calendar...' : 'Generate Content Calendar'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{postCount}</p>
                <p className="text-xs text-slate-400">Total Calendar Posts in Notion</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Estimated runtime: 8–18 minutes · All posts pushed to Notion
          </p>
        </div>

        {/* Terminal with task controls */}
        <PipelineTerminal
          logs={logs}
          runId={runId}
          status={status}
          accentColor="blue"
          onStatusChange={handleStatusChange}
          onRestart={handleRestart}
          onDirective={handleDirective}
        />
      </div>
    </div>
  );
}
