import { pauseRun, resumeRun, stopRun, addDirective, getStatus } from '@/lib/pipeline-state';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { runId, action, text } = body as {
      runId?: string;
      action?: string;
      text?: string;
    };

    if (!runId || !action) {
      return Response.json({ error: 'runId and action are required' }, { status: 400 });
    }

    const currentStatus = getStatus(runId);
    if (currentStatus === null) {
      return Response.json({ error: 'Run not found — it may have already completed' }, { status: 404 });
    }

    switch (action) {
      case 'pause': {
        const ok = pauseRun(runId);
        if (!ok) return Response.json({ error: 'Cannot pause — run is not in running state' }, { status: 409 });
        return Response.json({ ok: true, status: 'paused' });
      }

      case 'resume': {
        const ok = resumeRun(runId);
        if (!ok) return Response.json({ error: 'Cannot resume — run is not paused' }, { status: 409 });
        return Response.json({ ok: true, status: 'running' });
      }

      case 'stop': {
        const ok = stopRun(runId);
        if (!ok) return Response.json({ error: 'Cannot stop — run not found' }, { status: 409 });
        return Response.json({ ok: true, status: 'stopped' });
      }

      case 'directive': {
        if (!text?.trim()) {
          return Response.json({ error: 'Directive text is required' }, { status: 400 });
        }
        const ok = addDirective(runId, text.trim());
        if (!ok) return Response.json({ error: 'Cannot add directive — run is stopped or not found' }, { status: 409 });
        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Failed to process control request' }, { status: 500 });
  }
}
