'use client';

import { useState, useCallback } from 'react';
import { Map, Play, FileText, CheckSquare, Info } from 'lucide-react';
import { usePipelineRunner } from '@/lib/use-pipeline-runner';
import { PipelineTerminal } from '@/components/PipelineTerminal';

export default function StrategyPipeline() {
  const [period, setPeriod] = useState('30 days');
  const [customContext, setCustomContext] = useState('');

  const {
    logs, status, runId,
    startRun, handleStatusChange, handleDirective, resetRun,
  } = usePipelineRunner();

  const isRunning = status === 'running' || status === 'paused';

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    await startRun('/api/pipelines/strategy', {
      period,
      customContext: customContext.trim() || undefined,
    });
  };

  const handleRestart = useCallback(() => {
    resetRun();
  }, [resetRun]);

  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Map className="w-8 h-8 text-green-400" />
          </div>
          Pipeline 2: Content Strategy Planning and Building
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Builds a 7–90 day actionable content strategy grounded in your market research, ICP, and competitor analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Configuration</h2>

            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-5">
              <Info className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <p className="text-xs text-green-300">
                Automatically reads your latest research from Notion (Pipeline 1). Run Pipeline 1 first for grounded, data-backed strategy.
              </p>
            </div>

            <form onSubmit={handleRun} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Strategy Period <span className="text-green-500">*</span>
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  disabled={isRunning}
                >
                  <option value="30 days">30 Days</option>
                  <option value="60 days">60 Days</option>
                  <option value="90 days">90 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Additional Context <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <textarea
                  placeholder="Any additional goals, upcoming launches, campaigns, or constraints to factor into the strategy..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  disabled={isRunning}
                />
              </div>

              <button
                type="submit"
                disabled={isRunning}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                  isRunning
                    ? 'bg-slate-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25'
                }`}
              >
                {isRunning ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" fill="currentColor" />
                )}
                {isRunning ? 'Building Strategy...' : 'Build Content Strategy'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <FileText className="w-7 h-7 text-green-400 mb-2" />
              <span className="text-xs text-slate-400">Strategy Document</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <CheckSquare className="w-7 h-7 text-green-400 mb-2" />
              <span className="text-xs text-slate-400">Execution Checklist</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Estimated runtime: 4–8 minutes · Strategy saved to Notion
          </p>
        </div>

        {/* Terminal with task controls */}
        <PipelineTerminal
          logs={logs}
          runId={runId}
          status={status}
          accentColor="green"
          onStatusChange={handleStatusChange}
          onRestart={handleRestart}
          onDirective={handleDirective}
        />
      </div>
    </div>
  );
}
