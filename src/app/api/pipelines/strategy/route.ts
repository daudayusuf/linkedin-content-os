import Anthropic from '@anthropic-ai/sdk';
import { getLatestResearchOutput, saveStrategyOutput, logActivity } from '@/lib/notion';
import { createRun, deleteRun, waitWhilePaused, buildDirectiveContext } from '@/lib/pipeline-state';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

export async function POST(request: Request) {
  try {
    const { period, customContext } = await request.json();
    if (!period) {
      return new Response(JSON.stringify({ error: 'Strategy period is required' }), { status: 400 });
    }

    // Generate a unique run ID for task control
    const runId = `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        // Send the runId as the very first event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          send('Initializing Pipeline 2: Content Strategy Planning and Building...');
          send(`Strategy period: ${period}`);
          send('');

          // === Check for pause/stop before Step 1 ===
          await waitWhilePaused(runId, send);

          // Step 1 — Load research context
          send('Step 1/4 — Loading research context from Notion...');
          const researchContext = await getLatestResearchOutput();

          if (!researchContext) {
            send('⚠️  No research outputs found in Notion. Building strategy from custom context only.');
            send('   Tip: Run Pipeline 1 (Market Research) first for grounded strategy outputs.');
          } else {
            send('✅ Research context loaded from Notion');
          }

          const contextSection = researchContext
            ? `## Research Context (from Pipeline 1)\n\n${researchContext.slice(0, 3000)}`
            : customContext
            ? `## Custom Context\n\n${customContext}`
            : 'No prior research available — build strategy from first principles.';

          // === Check for pause/stop before Step 2 ===
          await waitWhilePaused(runId, send);

          // Step 2 — Define content pillars
          send('');
          send('Step 2/4 — Defining content pillars and strategic themes...');
          const directiveCtx1 = buildDirectiveContext(runId);
          const pillarsAnalysis = await callClaude(
            `You are a LinkedIn content strategist. Based on the research context below, define the content pillars for a ${period} LinkedIn strategy.

${contextSection}
${customContext ? `\n## Additional Context\n${customContext}` : ''}

Define exactly 6 content pillars. For each pillar:
- Give it a clear, memorable name
- Write a 2-3 sentence description of what content fits under it
- List 4-5 specific content angles or topics
- Specify the primary audience segment it targets
- Explain why this pillar serves the overall LinkedIn growth strategy
${directiveCtx1}
The pillars should collectively cover: thought leadership, educational content, personal brand, social proof, audience engagement, and category ownership.`,
            2000
          );
          send('✅ 6 content pillars defined');

          // === Check for pause/stop before Step 3 ===
          await waitWhilePaused(runId, send);

          // Step 3 — Build full strategy document
          send('');
          send('Step 3/4 — Writing full content strategy document...');
          const directiveCtx2 = buildDirectiveContext(runId);
          const strategyDoc = await callClaude(
            `You are a senior LinkedIn content strategist. Write a complete ${period} content strategy document.

${contextSection}
${customContext ? `\n## Additional Context\n${customContext}` : ''}

## Content Pillars
${pillarsAnalysis.slice(0, 1500)}

Write a comprehensive strategy document covering:
1. **Executive Summary** — the core strategic direction and goals for this period
2. **Content Mix** — breakdown of formats (text posts, carousels, polls, etc.) and their ratios
3. **Posting Cadence** — days, times, and frequency recommendations
4. **Week-by-Week Focus** — thematic focus for each week of the period
5. **Key Messages** — 5 core narratives that should run through all content
6. **CTA Strategy** — what actions to drive toward (DMs, newsletter, discovery calls)
7. **Engagement Strategy** — how to grow through commenting and outreach
8. **Success Metrics** — what KPIs to track and what targets to aim for
${directiveCtx2}
Be specific and actionable. This document will be used to generate a full content calendar.`,
            2200
          );
          send('✅ Full strategy document written');

          // === Check for pause/stop before Step 4 ===
          await waitWhilePaused(runId, send);

          // Step 4 — Generate execution checklist
          send('');
          send('Step 4/4 — Generating execution checklist...');
          const directiveCtx3 = buildDirectiveContext(runId);
          const checklist = await callClaude(
            `Based on this ${period} content strategy:

${strategyDoc.slice(0, 1500)}

Generate a weekly execution checklist — the specific tasks to complete each week to implement this strategy successfully.

Format as:
## Week 1
- [ ] Task 1
- [ ] Task 2
...

## Week 2
...
${directiveCtx3}
Include tasks for: content creation, scheduling, engagement sessions, analytics review, and strategy adjustments. Make each task specific and completable in under 2 hours.`,
            1500
          );
          send('✅ Execution checklist generated');

          // Save to Notion
          send('');
          send('Saving strategy outputs to Notion...');
          try {
            await saveStrategyOutput({
              period,
              content: strategyDoc,
              checklist,
            });
            await logActivity({
              title: `Strategy pipeline completed — ${period}`,
              description: 'Full strategy document + execution checklist saved',
              pipeline: 'Strategy',
              type: 'success',
            });
            send('✅ Strategy document and checklist saved to Notion');
          } catch (err: any) {
            send('⚠️  Strategy complete — Notion save encountered an issue (check API key)');
            console.error('[strategy] Notion save failed:', err.message);
          }

          send('');
          send('─────── STRATEGY COMPLETE ───────────');
          send('Pipeline 2 finished. Run Pipeline 3 (Content Calendar) to generate your 30-day calendar using this strategy.');

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          if (err.message === 'PIPELINE_STOPPED') {
            send('⏹  Pipeline stopped by user');
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } else {
            send(`❌ Error: ${err.message}`);
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
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
