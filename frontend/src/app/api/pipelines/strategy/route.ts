import Anthropic from '@anthropic-ai/sdk';
import { getLatestResearchOutputBundle, saveStrategyOutput, logActivity } from '@/lib/notion';
import { createRun, deleteRun, waitWhilePaused, buildDirectiveContext } from '@/lib/pipeline-state';
import { getResearchContext } from '@/lib/research';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

async function callOpenRouterResearch(prompt: string, maxTokens = 1800): Promise<string> {
  const apiKey = (process.env.OPENROUTER_API_KEY ?? '').trim();
  if (!apiKey) return '';

  const model = (process.env.OPENROUTER_STRATEGY_MODEL ?? 'perplexity/sonar-pro').trim();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior B2B content research analyst. Provide concrete, evidence-oriented findings and practical recommendations in markdown.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status})`);
  }

  const json = await response.json();
  return json?.choices?.[0]?.message?.content ?? '';
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

          // Step 1 — Pull best available research context
          send('Step 1/4 — Collecting research context (Pipeline 1 + fallback sources)...');
          const bundle = await getLatestResearchOutputBundle(72);

          let sourceSummary = '';
          let researchOverview = '';
          let researchContext = '';

          if (bundle.hasRecent && bundle.context.trim()) {
            researchContext = bundle.context.slice(0, 8000);
            sourceSummary = `Using recent Pipeline 1 research (${bundle.ageHours ?? 0}h old) across sections: ${bundle.sections.join(', ') || 'unspecified sections'}.`;
            send(`✅ Recent Pipeline 1 research found (${bundle.ageHours ?? 0}h old)`);
          } else {
            send('⚠️  No recent Pipeline 1 research found. Building fallback research context...');

            const localResearch = getResearchContext();
            if (localResearch.trim()) {
              researchContext = `## Local Research Artifacts\n\n${localResearch.slice(0, 5000)}`;
              sourceSummary = 'Using local Pipeline 1 markdown outputs from filesystem (fallback mode).';
              send('✅ Loaded local research artifacts from Pipeline 1 outputs folder');
            }

            try {
              send('Running external market scan via OpenRouter/Perplexity...');
              const externalBrief = await callOpenRouterResearch(
                `Build a concise but evidence-rich LinkedIn market brief for a ${period} B2B content strategy.\n\nContext:\n${customContext?.trim() || 'No additional user context provided.'}\n\nReturn markdown with sections:\n1) Category shifts in 2025-2026\n2) What top creators/brands are doing that works\n3) What is underperforming\n4) Messaging opportunities\n5) 8 practical strategy implications`,
                1600
              );

              if (externalBrief.trim()) {
                researchOverview = externalBrief;
                researchContext = [researchContext, `## External Market Scan (OpenRouter/Perplexity)\n\n${externalBrief}`]
                  .filter(Boolean)
                  .join('\n\n---\n\n')
                  .slice(0, 10000);
                sourceSummary = sourceSummary
                  ? `${sourceSummary} Also enriched with OpenRouter/Perplexity external market scan.`
                  : 'Using OpenRouter/Perplexity external market scan (no recent Pipeline 1 research found).';
                send('✅ External market scan completed');
              }
            } catch (err: any) {
              send('⚠️  External market scan unavailable. Continuing with available context.');
              console.error('[strategy] external research failed:', err.message);
            }

            if (!researchContext.trim()) {
              sourceSummary =
                'No recent Pipeline 1 research was available and no fallback context was found. Strategy generated from custom context and first principles.';
            }
          }

          const contextSection = [
            sourceSummary ? `## Source Summary\n${sourceSummary}` : '',
            researchContext ? `## Research Context\n\n${researchContext}` : '',
            customContext?.trim() ? `## Additional User Context\n\n${customContext.trim()}` : '',
          ]
            .filter(Boolean)
            .join('\n\n');

          if (!researchOverview.trim()) {
            researchOverview = bundle.context
              ? `Pipeline 1 context used (${bundle.ageHours ?? 0}h old). Sections available: ${bundle.sections.join(', ') || 'not specified'}.`
              : 'Fallback strategy mode: no recent Pipeline 1 context detected.';
          }

          // === Check for pause/stop before Step 2 ===
          await waitWhilePaused(runId, send);

          // Step 2 — Build strategic diagnosis + pillars
          send('');
          send('Step 2/4 — Building strategic diagnosis, gaps, and content pillars...');
          const directiveCtx1 = buildDirectiveContext(runId);
          const strategicDiagnosis = await callClaude(
            `You are a principal content strategy consultant. Analyze the context and produce a high-clarity strategic diagnosis for a ${period} LinkedIn growth plan.

${contextSection}

Return markdown with these sections:
## Executive Diagnosis
## Audience Reality Check
## Competitive Signal Scan
## What's Working
## What's Not Working
## Strategic Gaps
## Priority Bets (Top 5)

Then add:
## Content Pillars (exactly 6)
For each pillar include:
- Pillar name
- Why this matters now
- Target segment
- 5 concrete post angles
- Outcome this pillar should drive

${directiveCtx1}
Ground every section in the context provided. Be specific and avoid generic advice.`,
            2600
          );
          send('✅ Strategic diagnosis and 6 pillars completed');

          // === Check for pause/stop before Step 3 ===
          await waitWhilePaused(runId, send);

          // Step 3 — Build full strategy document
          send('');
          send('Step 3/4 — Writing consultant-grade strategy blueprint...');
          const directiveCtx2 = buildDirectiveContext(runId);
          const strategyDoc = await callClaude(
            `You are a senior content strategy consultant. Write a complete ${period} LinkedIn strategy blueprint that an execution team can run immediately.

${contextSection}

## Strategic Diagnosis
${strategicDiagnosis.slice(0, 2500)}

Output markdown using exactly these sections:
## Executive Summary
## Strategic Objectives (3-5)
## ICP Segments and Message-Market Fit
## Positioning and Narrative Framework
## Pillar Matrix (6 pillars with format mix and CTA intent)
## Weekly Operating Plan
## Channel Mechanics (posting cadence, hooks, retention patterns)
## Offer and CTA System
## Engagement and Distribution Engine
## Risks and Mitigations
## KPI Tree and Targets
## 30/60/90-Day Action Plan

Rules:
- Every section must contain concrete actions, not abstractions.
- Include explicit choices and trade-offs.
- Include a "Why this is the right move" bullet set in major sections.
- Include at least 12 implementation bullets spread across the plan.
${directiveCtx2}
This document will feed Pipeline 3, so prioritize operational clarity.`,
            3200
          );
          send('✅ Consultant-grade strategy blueprint completed');

          // === Check for pause/stop before Step 4 ===
          await waitWhilePaused(runId, send);

          // Step 4 — Generate execution checklist
          send('');
          send('Step 4/4 — Generating execution checklist and QA gates...');
          const directiveCtx3 = buildDirectiveContext(runId);
          const checklist = await callClaude(
            `Based on this ${period} content strategy:

${strategyDoc.slice(0, 1500)}

Generate a weekly execution checklist with quality-control gates.

Format as:
## Week 1
- [ ] Task 1
- [ ] Task 2
...

## Week 2
...
${directiveCtx3}
Include tasks for: content creation, scheduling, engagement sessions, analytics review, strategy adjustment, and one QA checkpoint per week.
Every task must include an owner role and expected output in parentheses, e.g. (Owner: Content Lead | Output: 3 draft posts).
Make each task specific and completable in under 2 hours.`,
            1800
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
              researchOverview,
              strategicDiagnosis,
              sourceSummary,
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
