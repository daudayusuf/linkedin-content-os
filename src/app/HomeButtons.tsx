'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCcw } from 'lucide-react';

export function HomeButtons() {
  const router = useRouter();
  return (
    <div className="flex gap-4">
      <button
        onClick={() => router.refresh()}
        className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-black/20 flex items-center gap-2"
      >
        <RefreshCcw className="w-4 h-4 text-slate-400" />
        Refresh Data
      </button>
      <button
        onClick={() => router.push('/pipelines/ideation')}
        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
      >
        New Campaign <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
