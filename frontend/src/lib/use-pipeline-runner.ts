'use client';

import { useState, useCallback, useRef } from 'react';
import type { PipelineStatus } from '@/components/PipelineController';
import type { LogEntry } from '@/components/PipelineTerminal';

export function usePipelineRunner() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [runId, setRunId] = useState<string | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const runIdRef = useRef<string | null>(null);

  const addLog = useCallback((text: string) => {
    const time = new Date().toLocaleTimeString([], {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    setLogs((prev) => [...prev, { text, time }]);
  }, []);

  const startRun = useCallback(
    async (
      apiUrl: string,
      body: Record<string, unknown>,
      opts?: { onComplete?: () => void },
    ) => {
      setStatus('running');
      setLogs([]);
      setRunId(null);
      runIdRef.current = null;

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          let message = `Request failed (${response.status})`;
          try {
            const payload = await response.json();
            if (typeof payload?.error === 'string' && payload.error.trim()) message = payload.error;
          } catch {}
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            if (retryAfter) message = `${message} Retry in ${retryAfter}s.`;
          }
          throw new Error(message);
        }

        if (!response.body) throw new Error('No readable stream available');

        const reader = response.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);

          for (const line of chunk.split('\n\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                setStatus('completed');
                opts?.onComplete?.();
                break;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.runId && !runIdRef.current) {
                  runIdRef.current = parsed.runId;
                  setRunId(parsed.runId);
                }

                if (parsed.message) {
                  addLog(parsed.message);
                }
              } catch {}
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to connect to backend server.';
        addLog(`❌ ${message}`);
        setStatus('stopped');
      } finally {
        readerRef.current = null;
      }
    },
    [addLog],
  );

  const handleStatusChange = useCallback((newStatus: PipelineStatus) => {
    setStatus(newStatus);
    if (newStatus === 'stopped' && readerRef.current) {
      readerRef.current.cancel().catch(() => {});
    }
  }, []);

  const handleDirective = useCallback(
    (text: string) => { addLog(`💬 User directive: "${text}"`); },
    [addLog],
  );

  const resetRun = useCallback(() => {
    setLogs([]);
    setStatus('idle');
    setRunId(null);
    runIdRef.current = null;
  }, []);

  return { logs, status, runId, startRun, handleStatusChange, handleDirective, resetRun, addLog, setStatus };
}
