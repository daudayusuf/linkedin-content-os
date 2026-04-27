import { BarChart2 } from 'lucide-react';

export default function PerformancePipeline() {
  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            Run via Python CLI
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <BarChart2 className="w-8 h-8 text-cyan-400" />
          </div>
          Pipeline 5b: Performance Analysis
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Generate weekly and monthly LinkedIn performance snapshots and identify your best-performing content patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">How to Run</h2>
          <p className="text-slate-300 leading-relaxed">
            Execute <code className="text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">python tools/run_pipeline.py</code> from the '5b. Performance Analysis Snapshot & Metrics' folder. Outputs are saved as markdown reports in the outputs/ directory.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">What It Produces</h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">•</span>
              Weekly performance snapshot (impressions, engagement, follower growth)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">•</span>
              Best-performing post analysis
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">•</span>
              Content pillar breakdown
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-1">•</span>
              Recommendations for next week
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
