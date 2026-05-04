import Anthropic from '@anthropic-ai/sdk';
import { saveResearchOutput, logActivity } from '@/lib/notion';
import { createRun, deleteRun, waitWhilePaused, buildDirectiveContext } from '@/lib/pipeline-state';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(prompt: string, maxTokens = 1500): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

export async function POST(request: Request) {
  try {
    const { niche, icpSummary, competitors } = await request.json();
    if (!niche || !icpSummary) {
      return new Response(JSON.stringify({ error: 'Niche and ICP summary are required' }), { status: 400 });
    }

    const competitorList = Array.isArray(competitors)
      ? competitors.join(', ')
      : String(competitors || 'Not specified');

    // Generate a unique run ID for task control
    const runId = `research-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        // Send the runId as the very first event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          send('Initializing Pipeline 1: Market, Audience & Competitor Research...');
          send(`Niche: ${niche}`);
          send(`ICP: ${icpSummary.slice(0, 120)}...`);
          send('');

          // === Check for pause/stop before Step 1 ===
          await waitWhilePaused(runId, send);

          // Step 1 — Market landscape analysis
          send('Step 1/4 — Analyzing market landscape and trends...');
          const directiveCtx1 = buildDirectiveContext(runId);
          const marketAnalysis = await callClaude(
            `You are a B2B market research analyst. Conduct a thorough market landscape analysis for the following niche.

Niche: ${niche}
ICP: ${icpSummary}

Provide a 600-800 word analysis covering:
1. Market overview and size (current state, growth trajectory)
2. Key trends reshaping the space in 2025-2026
3. Major pain points buyers face in this market
4. Positioning gaps — what are most players missing?
5. Content opportunities — what topics are underserved on LinkedIn?
6. Recommended positioning angles for a thought leader in this space
${directiveCtx1}
Be specific, data-informed, and actionable. Reference real trends and market dynamics.`,
            1800
          );
          send('✅ Market landscape analysis complete');

          // === Check for pause/stop before Step 2 ===
          await waitWhilePaused(runId, send);

          // Step 2 — Audience/ICP deep-dive
          send('');
          send('Step 2/4 — Running ICP deep-dive and audience mapping...');
          const directiveCtx2 = buildDirectiveContext(runId);
          const audienceAnalysis = await callClaude(
            `You are an audience research specialist for LinkedIn content strategy.

Niche: ${niche}
ICP Profile: ${icpSummary}

Conduct a deep-dive audience analysis covering:
1. Psychographic profile — mindset, fears, aspirations, what keeps them up at night
2. LinkedIn behaviour — what content do they engage with? What do they scroll past?
3. Buying triggers — what signals indicate they're ready to make a decision?
4. Content intent map — what are they searching for / wanting to learn?
5. Voice and language — phrases they use, jargon they trust, language to avoid
6. Top 5 content hooks that would immediately grab their attention
${directiveCtx2}
Be specific to this ICP. Avoid generic advice. Make it actionable for content creation.`,
            1800
          );
          send('✅ Audience research and ICP mapping complete');

          // === Check for pause/stop before Step 3 ===
          await waitWhilePaused(runId, send);

          // Step 3 — Competitor analysis
          send('');
          send('Step 3/4 — Analysing competitor content strategies...');
          const directiveCtx3 = buildDirectiveContext(runId);
          const competitorAnalysis = await callClaude(
            `You are a competitive intelligence analyst for LinkedIn content strategy.

Niche: ${niche}
Competitors to analyse: ${competitorList}

Provide a competitor content analysis covering:
1. Content patterns — what formats and topics do these players focus on?
2. Engagement patterns — what seems to perform well for them?
3. Positioning — how do they position themselves? What claims do they make?
4. Weaknesses and gaps — what are they missing? Where is their content shallow?
5. Differentiation angles — 5 specific ways to stand out against this competitive set
6. Content white space — topics or formats they're NOT doing that represent an opportunity
${directiveCtx3}
If specific competitors weren't provided (${competitorList === 'Not specified' ? 'yes' : 'no'}), analyse the typical competitor landscape for this niche.`,
            1800
          );
          send('✅ Competitor analysis and differentiation angles complete');

          // === Check for pause/stop before Step 4 ===
          await waitWhilePaused(runId, send);

          // Step 4 — Executive summary
          send('');
          send('Step 4/4 — Synthesizing executive summary and content angles...');
          const directiveCtx4 = buildDirectiveContext(runId);
          const executiveSummary = await callClaude(
            `You are a strategic content advisor. Synthesize the following research into a crisp executive summary.

Niche: ${niche}
ICP: ${icpSummary}

Market Research (summary):
${marketAnalysis.slice(0, 800)}

Audience Research (summary):
${audienceAnalysis.slice(0, 800)}

Competitor Research (summary):
${competitorAnalysis.slice(0, 800)}

Write an executive summary covering:
1. The single biggest opportunity in this space right now
2. The 3 most important ICP insights that should drive content
3. The 3 clearest differentiation angles vs. competitors
4. The 6 recommended content pillars for a 30-90 day LinkedIn strategy
5. The top 3 content formats that will resonate most with this audience
${directiveCtx4}
Keep it sharp, strategic, and immediately actionable.`,
            1500
          );
          send('✅ Executive summary synthesized');

          // Save to Notion
          send('');
          send('Saving research outputs to Notion...');
          try {
            await Promise.all([
              saveResearchOutput({ section: 'Market', content: marketAnalysis, niche }),
              saveResearchOutput({ section: 'Audience', content: audienceAnalysis, niche }),
              saveResearchOutput({ section: 'Competitor', content: competitorAnalysis, niche }),
              saveResearchOutput({ section: 'Executive Summary', content: executiveSummary, niche }),
            ]);
            send('✅ All 4 research sections saved to Notion');
            await logActivity({ title: 'Research pipeline completed', description: `Niche: ${niche}`, pipeline: 'Research', type: 'success' });
          } catch (err: any) {
            send('⚠️ Research complete — Notion save encountered an issue (check API key)');
            console.error('[research] Notion save failed:', err.message);
          }

          send('');
          send('─────── RESEARCH COMPLETE ───────────');
          send('Pipeline 1 finished. Run Pipeline 2 (Content Strategy) to build your strategy using this research.');

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
