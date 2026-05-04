import Anthropic from '@anthropic-ai/sdk';
import { saveEngagementPlan } from '@/lib/notion';
import { createRun, deleteRun, waitWhilePaused, buildDirectiveContext } from '@/lib/pipeline-state';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { targetAccount } = await request.json();
    if (!targetAccount) {
      return new Response(JSON.stringify({ error: 'Target Account / Search URL is required' }), { status: 400 });
    }

    // Generate a unique run ID for task control
    const runId = `engagement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        // Send the runId as the very first event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          send(`Initializing Pipeline 3: Engagement Session Plans...`);
          send(`Target Audience: ${targetAccount}`);
          send('Analyzing target audience profile and pain points...');

          // === Check for pause/stop before connection requests ===
          await waitWhilePaused(runId, send);

          // Generate personalized connection requests
          const directiveCtx1 = buildDirectiveContext(runId);
          const connectionResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1200,
            messages: [
              {
                role: 'user',
                content: `You are a LinkedIn engagement specialist for Daud Yusuf, a B2B content strategist.

Generate 5 personalized LinkedIn connection request notes for prospects in: "${targetAccount}"

Each connection note must:
- Be under 300 characters (LinkedIn limit)
- Reference their specific role/industry
- Mention a genuine reason to connect (shared interest, their content, mutual benefit)
- Feel human and warm, not salesy
- NOT use: "I came across your profile", "synergies", "leverage", "touch base"
${directiveCtx1}
Format:
Note 1: [connection note]
Note 2: [connection note]
...`,
              },
            ],
          });

          const connectionNotes = connectionResponse.content[0].type === 'text' ? connectionResponse.content[0].text : '';

          send('Drafting personalized connection request notes...');
          send('');
          send('─────── CONNECTION REQUESTS ───────');
          for (const line of connectionNotes.split('\n')) if (line.trim()) send(line);
          send('────────────────────────────────────');

          // === Check for pause/stop before comment starters ===
          await waitWhilePaused(runId, send);

          send('');
          send('Generating high-value comment starters...');

          // Generate comment starters
          const directiveCtx2 = buildDirectiveContext(runId);
          const commentsResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1200,
            messages: [
              {
                role: 'user',
                content: `Generate 7 high-value LinkedIn comment templates for engaging with "${targetAccount}" prospects.

Each comment should:
- Add genuine value or a new perspective (not just "Great post!")
- Be 2-4 sentences long
- Include a question to spark further conversation
- Feel specific even though it's a template (use [TOPIC] placeholders where needed)
- Position Daud Yusuf as a thoughtful peer, not a vendor
${directiveCtx2}
Format:
Comment 1: [comment text]
Comment 2: [comment text]
...`,
              },
            ],
          });

          const comments = commentsResponse.content[0].type === 'text' ? commentsResponse.content[0].text : '';

          send('');
          send('─────── COMMENT STARTERS ───────────');
          for (const line of comments.split('\n')) if (line.trim()) send(line);
          send('────────────────────────────────────');

          // === Check for pause/stop before saving ===
          await waitWhilePaused(runId, send);

          send('');
          send('Saving engagement plan to Notion CRM...');
          try {
            await saveEngagementPlan({
              target: targetAccount,
              connectionNotes,
              commentTemplates: comments,
            });
            send('✅ Engagement plan saved to Notion CRM — 5 connection notes + 7 comment templates.');
          } catch (notionErr: any) {
            send('✅ Engagement Session Plan generated.');
            console.error('[engagement] Notion save failed:', notionErr.message);
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          if (err.message === 'PIPELINE_STOPPED') {
            send('⏹  Pipeline stopped by user');
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } else {
            send(`❌ Error: ${err.message}`);
            controller.close();
          }
        } finally {
          deleteRun(runId);
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 });
  }
}
