'use client';

import { useState, useCallback } from 'react';
import { BarChart2, Play } from 'lucide-react';
import { usePipelineRunner } from '@/lib/use-pipeline-runner';
import { PipelineTerminal } from '@/components/PipelineTerminal';

function prevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function PerformancePipeline() {
  const [targetMonth, setTargetMonth] = useState(prevMonth());

  const {
    logs, status, runId,
    startRun, handleStatusChange, handleDirective, resetRun,
  } = usePipelineRunner();

  const isRunning = status === 'running' || status === 'paused';

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    await startRun('/api/pipelines/performance', { targetMonth });
  };

  const handleRestart = useCallback(() => {
    resetRun();
  }, [resetRun]);

  return (
    <div className="p-4 md:p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6 md:mb-8 border-b border-slate-800 pb-4 md:pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg shrink-0">
            <BarChart2 className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
          </div>
          Pipeline 5b: Performance Analysis
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Aggregates your LinkedIn post metrics, generates a monthly performance snapshot, and identifies your best-performing content patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>

            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Target Month
                </label>
                <input
                  type="month"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  disabled={isRunning}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRunning || !targetMonth}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning
                    ? 'bg-slate-800 cursor-not-allowed'
                    : targetMonth
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Analyzing...' : 'Run Performance Analysis'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">What It Produces</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              {[
                'Monthly engagement overview (reactions, comments, averages)',
                'Best-performing post analysis',
                'Content pillar breakdown by category',
                'Performance grade (A–F) with score out of 100',
                'Top 3 recommendations for next month',
                'Snapshot saved to Notion Performance Dashboard',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Terminal with task controls */}
        <PipelineTerminal
          logs={logs}
          runId={runId}
          status={status}
          accentColor="cyan"
          onStatusChange={handleStatusChange}
          onRestart={handleRestart}
          onDirective={handleDirective}
        />
      </div>
    </div>
  );
}
