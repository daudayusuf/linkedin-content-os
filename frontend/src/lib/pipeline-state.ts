/**
 * Pipeline Run State Manager
 * 
 * In-memory store that tracks the status of each pipeline run.
 * Pipeline API routes check this store between steps to support
 * pause, resume, stop, and live user directives.
 * 
 * NOTE: This works for single-instance / single-user deployments.
 * For multi-instance (e.g. multiple serverless functions), a shared
 * store like Redis would be needed instead.
 */

export type RunStatus = 'running' | 'paused' | 'stopped';

interface PipelineRun {
  status: RunStatus;
  directives: string[];
  createdAt: number;
}

const runs = new Map<string, PipelineRun>();

/** Register a new pipeline run */
export function createRun(runId: string): void {
  runs.set(runId, {
    status: 'running',
    directives: [],
    createdAt: Date.now(),
  });
}

/** Get the current status of a run, or null if not found */
export function getStatus(runId: string): RunStatus | null {
  return runs.get(runId)?.status ?? null;
}

/** Pause a running pipeline */
export function pauseRun(runId: string): boolean {
  const run = runs.get(runId);
  if (!run || run.status !== 'running') return false;
  run.status = 'paused';
  return true;
}

/** Resume a paused pipeline */
export function resumeRun(runId: string): boolean {
  const run = runs.get(runId);
  if (!run || run.status !== 'paused') return false;
  run.status = 'running';
  return true;
}

/** Stop a pipeline (from any state) */
export function stopRun(runId: string): boolean {
  const run = runs.get(runId);
  if (!run) return false;
  run.status = 'stopped';
  return true;
}

/** Add a user directive to the queue */
export function addDirective(runId: string, text: string): boolean {
  const run = runs.get(runId);
  if (!run || run.status === 'stopped') return false;
  run.directives.push(text);
  return true;
}

/** Consume (pop) all pending directives. Returns them and clears the queue. */
export function consumeDirectives(runId: string): string[] {
  const run = runs.get(runId);
  if (!run) return [];
  const pending = [...run.directives];
  run.directives = [];
  return pending;
}

/** Clean up a finished run */
export function deleteRun(runId: string): void {
  runs.delete(runId);
}

/**
 * Helper: sleep for `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Async helper that blocks while the run is paused.
 * - Resolves when status returns to 'running'.
 * - Throws an error (message 'PIPELINE_STOPPED') when status is 'stopped'.
 * - Also throws if the run doesn't exist.
 * 
 * Call this between each major step in a pipeline route.
 */
export async function waitWhilePaused(
  runId: string,
  send?: (msg: string) => void,
): Promise<void> {
  let notifiedPause = false;

  while (true) {
    const status = getStatus(runId);

    if (status === null || status === 'stopped') {
      throw new Error('PIPELINE_STOPPED');
    }

    if (status === 'running') {
      if (notifiedPause && send) {
        send('▶️  Pipeline resumed');
      }
      return;
    }

    // status === 'paused'
    if (!notifiedPause && send) {
      send('⏸  Pipeline paused — waiting for resume...');
      notifiedPause = true;
    }

    await sleep(500);
  }
}

/**
 * Build a directive context string to inject into Claude prompts.
 * Returns empty string if no directives are pending.
 */
export function buildDirectiveContext(runId: string): string {
  const directives = consumeDirectives(runId);
  if (directives.length === 0) return '';
  return `\n\n--- USER LIVE DIRECTIVES (follow these closely) ---\n${directives.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n--- END DIRECTIVES ---\n`;
}
