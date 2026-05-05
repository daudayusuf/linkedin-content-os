'use client';

import { useState, useCallback } from 'react';
import { Pause, Play, Square, RotateCcw, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type PipelineStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed';

interface PipelineControllerProps {
  runId: string | null;
  status: PipelineStatus;
  accentColor: string;
  onStatusChange: (newStatus: PipelineStatus) => void;
  onRestart?: () => void;
  onDirective?: (text: string) => void;
}

const STATUS_CONFIG: Record<PipelineStatus, { label: string; dotClass: string; bgClass: string }> = {
  idle:      { label: 'Idle',      dotClass: 'bg-slate-500',   bgClass: 'bg-slate-500/10 border-slate-500/20 text-slate-400' },
  running:   { label: 'Running',   dotClass: 'bg-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  paused:    { label: 'Paused',    dotClass: 'bg-amber-400',   bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  stopped:   { label: 'Stopped',   dotClass: 'bg-rose-400',    bgClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  completed: { label: 'Completed', dotClass: 'bg-blue-400',    bgClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
};

async function sendControl(runId: string, action: string, text?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/pipelines/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, action, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function PipelineController({
  runId,
  status,
  accentColor,
  onStatusChange,
  onRestart,
}: PipelineControllerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const isActive = status === 'running' || status === 'paused';

  const handlePause = useCallback(async () => {
    if (!runId || loading) return;
    setLoading('pause');
    const ok = await sendControl(runId, 'pause');
    if (ok) onStatusChange('paused');
    setLoading(null);
  }, [runId, loading, onStatusChange]);

  const handleResume = useCallback(async () => {
    if (!runId || loading) return;
    setLoading('resume');
    const ok = await sendControl(runId, 'resume');
    if (ok) onStatusChange('running');
    setLoading(null);
  }, [runId, loading, onStatusChange]);

  const handleStop = useCallback(async () => {
    if (!runId || loading) return;
    setLoading('stop');
    const ok = await sendControl(runId, 'stop');
    if (ok) onStatusChange('stopped');
    setLoading(null);
  }, [runId, loading, onStatusChange]);

  const handleRestart = useCallback(async () => {
    if (loading) return;
    if (runId && isActive) {
      setLoading('restart');
      await sendControl(runId, 'stop');
      setLoading(null);
    }
    onStatusChange('idle');
    onRestart?.();
  }, [runId, loading, isActive, onStatusChange, onRestart]);

  const cfg = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2">
      {/* Status Badge */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.bgClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} ${status === 'running' ? 'animate-pulse' : ''}`} />
        {cfg.label}
      </div>

      {/* Control buttons — visible when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1 ml-1"
          >
            {status === 'running' ? (
              <button
                onClick={handlePause}
                disabled={!!loading}
                title="Pause pipeline"
                className="p-1.5 rounded-lg transition-all hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 disabled:opacity-50"
              >
                {loading === 'pause' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <button
                onClick={handleResume}
                disabled={!!loading}
                title="Resume pipeline"
                className="p-1.5 rounded-lg transition-all hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
              >
                {loading === 'resume' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
              </button>
            )}

            <button
              onClick={handleStop}
              disabled={!!loading}
              title="Stop pipeline"
              className="p-1.5 rounded-lg transition-all hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 disabled:opacity-50"
            >
              {loading === 'stop' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" fill="currentColor" />}
            </button>

            <button
              onClick={handleRestart}
              disabled={!!loading}
              title="Restart pipeline"
              className="p-1.5 rounded-lg transition-all hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50"
            >
              {loading === 'restart' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restart button when stopped/completed */}
      <AnimatePresence>
        {(status === 'stopped' || status === 'completed') && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleRestart}
            disabled={!!loading}
            title="Restart pipeline"
            className="p-1.5 rounded-lg transition-all hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50 ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Color mappings for Tailwind (prevents purging of dynamic classes) ── */
const ACCENT_TEXT: Record<string, string> = {
  blue: 'text-blue-400', amber: 'text-amber-400', green: 'text-green-400',
  emerald: 'text-emerald-400', purple: 'text-purple-400', cyan: 'text-cyan-400',
};
const ACCENT_BG: Record<string, string> = {
  blue: 'bg-blue-500/20', amber: 'bg-amber-500/20', green: 'bg-green-500/20',
  emerald: 'bg-emerald-500/20', purple: 'bg-purple-500/20', cyan: 'bg-cyan-500/20',
};
const ACCENT_BG_HOVER: Record<string, string> = {
  blue: 'hover:bg-blue-500/30', amber: 'hover:bg-amber-500/30', green: 'hover:bg-green-500/30',
  emerald: 'hover:bg-emerald-500/30', purple: 'hover:bg-purple-500/30', cyan: 'hover:bg-cyan-500/30',
};

/**
 * Directive input bar — renders at the bottom of the terminal
 */
export function DirectiveInput({
  runId,
  isActive,
  accentColor,
  onDirective,
}: {
  runId: string | null;
  isActive: boolean;
  accentColor: string;
  onDirective?: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !runId || sending) return;
    setSending(true);
    const ok = await sendControl(runId, 'directive', text.trim());
    if (ok) {
      onDirective?.(text.trim());
      setText('');
    }
    setSending(false);
  };

  if (!isActive) return null;

  const promptColor = ACCENT_TEXT[accentColor] || 'text-blue-400';
  const btnBg = text.trim() ? (ACCENT_BG[accentColor] || 'bg-blue-500/20') : '';
  const btnText = text.trim() ? (ACCENT_TEXT[accentColor] || 'text-blue-400') : 'text-slate-600';
  const btnHover = text.trim() ? (ACCENT_BG_HOVER[accentColor] || '') : '';

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900/80"
    >
      <span className={`${promptColor} text-xs font-mono shrink-0`}>▸</span>
      <input
        type="text"
        placeholder="Type a directive... e.g. 'make the tone more casual'"
        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
      />
      <button
        type="submit"
        disabled={!text.trim() || sending}
        className={`p-1.5 rounded-lg transition-all ${btnBg} ${btnText} ${btnHover} disabled:opacity-50 ${!text.trim() ? 'cursor-not-allowed' : ''}`}
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </motion.form>
  );
}
