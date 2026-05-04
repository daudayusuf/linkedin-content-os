'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { PipelineController, DirectiveInput, type PipelineStatus } from './PipelineController';

export interface LogEntry {
  text: string;
  time: string;
}

interface PipelineTerminalProps {
  logs: LogEntry[];
  runId: string | null;
  status: PipelineStatus;
  accentColor: string;
  onStatusChange: (status: PipelineStatus) => void;
  onRestart?: () => void;
  onDirective?: (text: string) => void;
}

/* Static Tailwind class map to prevent purging */
const CURSOR_COLOR: Record<string, string> = {
  blue: 'text-blue-400', amber: 'text-amber-400', green: 'text-green-400',
  emerald: 'text-emerald-400', purple: 'text-purple-400', cyan: 'text-cyan-400',
};

function getLogColor(text: string): string {
  if (text.includes('✅')) return 'text-emerald-400';
  if (text.includes('❌')) return 'text-rose-400';
  if (text.includes('⚠️') || text.includes('⚠')) return 'text-amber-400';
  if (text.includes('⏸')) return 'text-amber-400';
  if (text.includes('▶️')) return 'text-emerald-400';
  if (text.includes('⏹')) return 'text-rose-400';
  if (text.includes('💬')) return 'text-purple-400';
  return 'text-slate-300';
}

export function PipelineTerminal({
  logs,
  runId,
  status,
  accentColor,
  onStatusChange,
  onRestart,
  onDirective,
}: PipelineTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isActive = status === 'running' || status === 'paused';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const cursorClass = CURSOR_COLOR[accentColor] || 'text-blue-400';

  return (
    <div className="bg-[#0c0c0c] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
      {/* Header bar */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Execution Logs</span>
        </div>

        <div className="flex items-center gap-3">
          <PipelineController
            runId={runId}
            status={status}
            accentColor={accentColor}
            onStatusChange={onStatusChange}
            onRestart={onRestart}
          />
          <div className="flex gap-1.5 ml-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
        </div>
      </div>

      {/* Log area */}
      <div ref={scrollRef} className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
        {status === 'idle' && logs.length === 0 ? (
          <p className="text-slate-600">Waiting for pipeline trigger...</p>
        ) : (
          logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex gap-3 ${getLogColor(log.text)}`}
            >
              <span className="text-slate-600 shrink-0">{log.time}</span>
              <span className="whitespace-pre-wrap">{log.text}</span>
            </motion.div>
          ))
        )}
        {status === 'running' && (
          <div className={`flex gap-3 ${cursorClass} items-center`}>
            <span className="text-slate-600 shrink-0">
              {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="animate-pulse">_</span>
          </div>
        )}
        {status === 'paused' && (
          <div className="flex gap-3 text-amber-400 items-center">
            <span className="text-slate-600 shrink-0">
              {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="animate-pulse">⏸ paused</span>
          </div>
        )}
      </div>

      {/* Directive input at bottom */}
      <DirectiveInput
        runId={runId}
        isActive={isActive}
        accentColor={accentColor}
        onDirective={onDirective}
      />
    </div>
  );
}
