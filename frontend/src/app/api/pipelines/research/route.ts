import Anthropic from '@anthropic-ai/sdk';
import { saveResearchOutput, saveResearchSprint, logActivity } from '@/lib/notion';
import { createRun, deleteRun, waitWhilePaused } from '@/lib/pipeline-state';

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(prompt: string, maxTokens = 2800): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

async function callPerplexity(query: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://frontend-tawny-eight-35.vercel.app',
      'X-Title': 'LinkedIn Content OS',
    },
    body: JSON.stringify({
      model: 'perplexity/sonar-pro',
      messages: [{ role: 'user', content: query }],
      max_tokens: 1200,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function today(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function quarter(): string {
  return `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;
}

// ─── Market Research ───────────────────────────────────────────────────────

async function runMarketResearch(niche: string, icpSummary: string): Promise<string> {
  const date = today();
  const [algo, formats, trends, pricing] = await Promise.all([
    callPerplexity(`LinkedIn algorithm 2026: ranking signals, dwell time thresholds, content reach penalties (external links, AI-detected content), what gets rewarded vs penalized. Include specific percentages and data.`),
    callPerplexity(`LinkedIn content format engagement rates 2026: document posts carousels, native video, text-only posts, polls, collaborative articles. Specific benchmark engagement percentages, what drives highest performance in each format.`),
    callPerplexity(`LinkedIn personal branding market trends 2026 for ${niche}: what content strategies are winning, what is oversaturated, emerging opportunities, gaps competitors are missing, what the algorithm now rewards.`),
    callPerplexity(`LinkedIn ghostwriting agency and personal branding service pricing 2026: retainer rates by tier, what agencies charge, market benchmarks, premium vs entry-level pricing, what clients pay.`),
  ]);

  return callClaude(`You are a senior B2B market research analyst. Using the Perplexity web research data below, write a deep consultant-grade market research report for a LinkedIn content agency targeting: ${niche}.

PERPLEXITY RESEARCH DATA:

[LINKEDIN ALGORITHM 2026]:
${algo}

[CONTENT FORMAT BENCHMARKS]:
${formats}

[MARKET TRENDS & OPPORTUNITIES]:
${trends}

[PRICING INTELLIGENCE]:
${pricing}

ICP Context: ${icpSummary.slice(0, 400)}

Write the report using EXACTLY this structure — use the specific data from the Perplexity research above:

**Run Date:** ${date} | **Model:** Perplexity Sonar Pro | **Queries:** 4 | **Focus:** ${niche}

---

## 1. LinkedIn Algorithm in 2026
[Write 300+ words. Include ALL specific percentages and penalties from the research: external link reach drop, AI content penalty if present, dwell time thresholds, first-hour window importance. Explain exactly what gets rewarded and what gets penalized with data.]

**Action:** [one specific, immediately actionable tactic based on algorithm signals]

---

## 2. Content Formats That Are Working Right Now
| Format | Engagement Rate | Key Tactic |
|--------|----------------|------------|
[Include document posts/carousels, native video, text posts, polls — use specific % data from research. 4-6 rows.]

[100+ word analysis of the format hierarchy and why it matters for ${niche}]

**Action:** [specific format strategy recommendation]

---

## 3. Market Trends — ${new Date().getFullYear()}

### What's Working:
[5+ specific trends with data from research]

### What's Played Out:
| Played-Out Approach | What Replaces It |
|--------------------|-----------------|
[4-5 rows showing the shift]

**Action:** [specific trend-aligned tactic]

---

## 4. Market Saturation Analysis
[200+ words on oversaturated vs underserved content spaces for ${niche}. Specific topics to avoid, specific white space to exploit, where the algorithm rewards uniqueness.]

**Action:** [content differentiation tactic]

---

## 5. Service Pricing Intelligence
| Market Tier | Monthly Range | What's Included |
|------------|--------------|-----------------|
[3-4 tiers with real market rate data from research]

[100+ words on pricing strategy and positioning for ${niche}]

**Action:** [pricing or positioning recommendation]

---

## 6. Growth Tactics — Ranked by Impact
1. [tactic with specific expected result and timeframe]
2. [tactic with specific expected result and timeframe]
3. [tactic with specific expected result and timeframe]
4. [tactic with specific expected result and timeframe]
5. [tactic with specific expected result and timeframe]

---

## Key Implications for ${niche}
- [Implication 1 with specific target or metric]
- [Implication 2 with specific target or metric]
- [Implication 3 with specific target or metric]
- [Implication 4 with specific target or metric]
- [Implication 5 with specific target or metric]

---
*Generated by Pipeline 1 · Perplexity Sonar Pro · ${date}*

RULES: Use ONLY data from the Perplexity research above. Include specific numbers. Be specific to ${niche}. No filler, no generic advice.`, 2200);
}

async function runMarketResearchFallback(niche: string, icpSummary: string): Promise<string> {
  const date = today();
  return callClaude(`You are a senior B2B market research analyst. Write a deep, data-rich market research report for a LinkedIn content agency targeting: ${niche}.

ICP: ${icpSummary.slice(0, 400)}

Use your knowledge of LinkedIn's 2026 algorithm, content format benchmarks, market trends, and pricing. Be specific with data and percentages.

**Run Date:** ${date} | **Model:** Claude Sonnet (Research Mode) | **Focus:** ${niche}

---

## 1. LinkedIn Algorithm in 2026
[Detailed algorithm analysis with specific signals and percentages]

**Action:** [one concrete tactic]

---

## 2. Content Formats That Are Working Right Now
| Format | Engagement Rate | Key Tactic |
|--------|----------------|------------|
[4-6 rows with real benchmarks]

[Analysis]

**Action:** [format strategy]

---

## 3. Market Trends — ${new Date().getFullYear()}

### What's Working:
[5 specific trends]

### What's Played Out:
| Played-Out Approach | What Replaces It |
|--------------------|-----------------|
[4 rows]

**Action:** [trend-aligned tactic]

---

## 4. Market Saturation Analysis
[200 words on oversaturated vs underserved spaces]

**Action:** [differentiation tactic]

---

## 5. Service Pricing Intelligence
| Market Tier | Monthly Range | What's Included |
|------------|--------------|-----------------|
[3-4 tiers with real rates]

[Pricing analysis]

**Action:** [pricing recommendation]

---

## 6. Growth Tactics — Ranked by Impact
1. [tactic with result]
2. [tactic with result]
3. [tactic with result]
4. [tactic with result]
5. [tactic with result]

---

## Key Implications for ${niche}
- [5 specific implications with metrics]

---
*Generated by Pipeline 1 · Claude Sonnet · ${date}*`, 2000);
}

// ─── Audience Research ────────────────────────────────────────────────────

async function runAudienceResearch(niche: string, icpSummary: string): Promise<string> {
  const date = today();
  const [painPoints, behavior, buying] = await Promise.all([
    callPerplexity(`${niche} decision makers and buyers: top pain points 2026, frustrations, what keeps them up at night, what problems they desperately need solved. Include specific challenges and fears.`),
    callPerplexity(`LinkedIn behavioral patterns 2026 for ${niche} audience: when they're active (peak days/hours), session duration, content engagement rates by format, what they click vs scroll past.`),
    callPerplexity(`${niche} buyer behavior 2026: budget allocation for services, decision-making timeline, ROI expectations, common objections, what triggers a yes vs what causes hesitation.`),
  ]);

  return callClaude(`You are an audience research specialist. Using the Perplexity research below, write a deep audience analysis for a LinkedIn content agency targeting: ${niche}.

PERPLEXITY RESEARCH:

[PAIN POINTS & CHALLENGES]:
${painPoints}

[LINKEDIN BEHAVIOR PATTERNS]:
${behavior}

[BUYING BEHAVIOR & DECISIONS]:
${buying}

ICP Profile: ${icpSummary.slice(0, 600)}

Write using EXACTLY this structure:

**Run Date:** ${date} | **Model:** Perplexity Sonar Pro | **Queries:** 3 | **Audience:** ${niche}

---

## 1. Updated Pain Points — ${quarter()}
[List 6-8 specific pain points. For each: name the pain, explain WHY it intensified in 2026, and what it costs them if unsolved. Note which are new vs existing but intensified.]

---

## 2. Behavioral Patterns
| Dimension | Data |
|-----------|------|
| Peak Engagement Days | [specific days] |
| Peak Engagement Hours | [specific times] |
| Avg Session Length | [data] |
| Sessions Per Week | [data] |
| Top Content Format | [format + engagement rate] |
| #2 Content Format | [format + engagement rate] |

[150+ words analyzing what drives their behavior and how to exploit these patterns for ${niche}]

---

## 3. Income Levels & Buying Behavior
[200+ words covering: budget range for LinkedIn services (specific dollar amounts), decision timeline, who signs off, common objections with exact wording, what closes the deal, ROI expectations and timeframes]

---

## 4. What They Want vs. Don't Want

**They want:**
- [6 specific items tied to ${niche} context]

**They don't want:**
- [6 specific items — what turns them off]

**Deal-breakers:** [2-3 specific triggers that lose the sale]
**Immediate yes triggers:** [2-3 specific triggers that close the sale]

---

## 5. Where They Spend Time Online

**Free platforms:** [5+ specific communities with why they matter]
**Paid communities:** [3-4 specific communities]
**Distribution opportunity:** [how to reach them on each platform before they find LinkedIn]

---

## 6. Content That Resonates

### Core Angles That Perform:
[4-5 specific content angles with engagement data or reasoning tied to ${niche}]

### Formats That Perform:
[3-4 formats with specific data points]

### What Turns Them Off:
- [4-5 specific turn-offs for this audience]

---

## Key Implications for ${niche} Content Strategy
- [5 specific, actionable implications with tactics and metrics]

---
*Generated by Pipeline 1 · Perplexity Sonar Pro · ${date}*

Use ONLY data from the Perplexity research. Be specific with numbers and timeframes. No generic advice.`, 2000);
}

async function runAudienceResearchFallback(niche: string, icpSummary: string): Promise<string> {
  const date = today();
  return callClaude(`You are an audience research specialist. Write a deep audience analysis for a LinkedIn content agency targeting: ${niche}.

ICP Profile: ${icpSummary.slice(0, 600)}

**Run Date:** ${date} | **Model:** Claude Sonnet (Research Mode) | **Audience:** ${niche}

---

## 1. Updated Pain Points — ${quarter()}
[6-8 specific pain points with 2026 context]

---

## 2. Behavioral Patterns
| Dimension | Data |
|-----------|------|
[Include peak times, session data, preferences]

[150+ word analysis]

---

## 3. Income Levels & Buying Behavior
[200+ words on budget, decision timeline, objections, what closes]

---

## 4. What They Want vs. Don't Want

**They want:**
[6 specific items]

**They don't want:**
[6 specific items]

**Deal-breakers:** [triggers]
**Immediate yes triggers:** [triggers]

---

## 5. Where They Spend Time Online
[Communities, platforms, distribution opportunities with specifics]

---

## 6. Content That Resonates
[Angles, formats, turn-offs — all specific to this audience]

---

## Key Implications for ${niche} Content Strategy
- [5 specific actionable implications]

---
*Generated by Pipeline 1 · Claude Sonnet · ${date}*`, 2000);
}

// ─── Competitor Research ──────────────────────────────────────────────────

async function runCompetitorResearch(niche: string, competitorList: string): Promise<string> {
  const date = today();
  const hasCompetitors = competitorList && competitorList !== 'Not specified';
  const competitors = hasCompetitors
    ? competitorList.split(',').map(c => c.trim()).filter(Boolean)
    : [];

  let perplexityData: string;

  if (competitors.length > 0) {
    const queries: Promise<string>[] = [
      callPerplexity(`Analyze these LinkedIn creators for ${niche}: ${competitors.slice(0, 3).join(', ')}. For each: follower count, content format mix, posting frequency, engagement rates, primary offer, pricing if visible, content pillars, strengths and gaps.`),
      competitors.length > 3
        ? callPerplexity(`Analyze these LinkedIn creators: ${competitors.slice(3).join(', ')}. For each: follower count, content strategy, engagement patterns, primary offer, weaknesses.`)
        : callPerplexity(`Content positioning gaps in the LinkedIn ${niche} market: what topics and formats are the top creators NOT covering? Where is the white space?`),
      callPerplexity(`Content gaps and positioning white space in LinkedIn ${niche} space 2026: what are top creators missing, what formats and topics are underserved, what angles are completely uncovered?`),
    ];
    const results = await Promise.all(queries);
    perplexityData = results.join('\n\n---\n\n');
  } else {
    const results = await Promise.all([
      callPerplexity(`Top LinkedIn creators and agencies in ${niche} 2026: who are the main players, their follower counts, content strategies, primary offers, pricing if visible, what they're known for.`),
      callPerplexity(`Content gaps and positioning white space in LinkedIn ${niche} market 2026: what are top creators missing, what formats and topics are underserved, where is the biggest opportunity?`),
    ]);
    perplexityData = results.join('\n\n---\n\n');
  }

  const competitorProfiles = hasCompetitors && competitors.length > 0
    ? competitors.slice(0, 5).map(c => `## ${c}
**Niche:** [their specific positioning from the research]
**Primary Offer:** [services and pricing if found]
**Content Pillars:** [3-5 main topics]
**Format Mix:** [% breakdown with posting frequency]
**Engagement:** [follower count, avg likes/comments, engagement rate]
**Strengths:** [3 specific strengths]
**Weaknesses/Gaps:** [3 specific gaps]
**Differentiation vs. ${niche}:** [how to win against them]

---`).join('\n\n')
    : `## Top Creators in This Space
[Profile each of the top 3-5 creators found — use the same format: Niche, Primary Offer, Content Pillars, Format Mix, Engagement, Strengths, Weaknesses/Gaps, Differentiation]

---`;

  return callClaude(`You are a competitive intelligence analyst. Using the Perplexity research below, write a deep competitor analysis for a LinkedIn content agency targeting: ${niche}.

PERPLEXITY COMPETITIVE RESEARCH:
${perplexityData}

${hasCompetitors ? `Competitors to analyze: ${competitorList}` : `(No specific competitors provided — analyze the general competitive landscape for ${niche} from the Perplexity research)`}

Write using EXACTLY this structure:

**Run Date:** ${date} | **Model:** Perplexity Sonar Pro | **Competitors:** ${competitors.length || 'Market landscape'} | **Niche:** ${niche}

---

## Competitive Landscape Summary
| Creator/Agency | Followers | Primary Offer | Niche | AI Integration | Retainer Model |
|---------------|-----------|---------------|-------|---------------|----------------|
[Include all competitors from the research. Use "No" for AI/Retainer if not found.]

**Key gap across all analyzed:** [one sentence on the biggest shared weakness across all competitors]

---

${competitorProfiles}

## Aggregate Analysis — Content Gaps

**Topics none of the analyzed creators cover well:**
- [5+ specific topic gaps with explanation]

**Format gaps:**
- [3+ specific format gaps — what they're not doing]

---

## Positioning White Space for ${niche}
**Own this territory:**
- [5 specific, concrete positioning angles that no competitor currently owns]

---
*Generated by Pipeline 1 · Perplexity Sonar Pro · ${date}*

Use ONLY data from the Perplexity research. Include specific follower counts, engagement rates, pricing where found. If data unavailable, note it clearly.`, 2200);
}

async function runCompetitorResearchFallback(niche: string, competitorList: string): Promise<string> {
  const date = today();
  const hasCompetitors = competitorList && competitorList !== 'Not specified';
  return callClaude(`You are a competitive intelligence analyst. Write a deep competitor analysis for a LinkedIn content agency targeting: ${niche}.

${hasCompetitors ? `Competitors: ${competitorList}` : `Analyze the general competitive landscape for ${niche}.`}

**Run Date:** ${date} | **Model:** Claude Sonnet (Research Mode) | **Niche:** ${niche}

Write with full structure including:
- Competitive Landscape Summary table (Followers, Primary Offer, Niche, AI Integration, Retainer Model)
- Individual profiles for each competitor (Niche, Primary Offer, Content Pillars, Format Mix, Engagement, Strengths, Weaknesses, Differentiation angle)
- Aggregate Content Gaps (topics AND format gaps)
- Positioning White Space (5 specific angles)

Be specific and consultant-grade. Use real data where known.

---
*Generated by Pipeline 1 · Claude Sonnet · ${date}*`, 3200);
}

// ─── Executive Summary ────────────────────────────────────────────────────

async function runExecutiveSummary(
  niche: string, icpSummary: string,
  market: string, audience: string, competitor: string,
): Promise<string> {
  const date = today();
  return callClaude(`You are a strategic advisor synthesizing three research reports into an executive summary.

NICHE: ${niche}
ICP: ${icpSummary.slice(0, 400)}

MARKET RESEARCH HIGHLIGHTS:
${market.slice(0, 1200)}

AUDIENCE RESEARCH HIGHLIGHTS:
${audience.slice(0, 1200)}

COMPETITOR RESEARCH HIGHLIGHTS:
${competitor.slice(0, 1200)}

Write using EXACTLY this structure:

**Run Date:** ${date} | **Model:** Claude Sonnet | **Synthesis of:** 3 Perplexity-backed research reports

---

## 🎯 The Single Biggest Opportunity Right Now
[200 words on the #1 opportunity in this market — specific, urgent, backed by the research above. Why now, why this, what happens if they miss it.]

---

## 🔑 3 Most Important ICP Insights
1. **[Insight title]:** [100 words — what this means and how it should shape every content decision]
2. **[Insight title]:** [100 words]
3. **[Insight title]:** [100 words]

---

## 🥊 3 Clearest Differentiation Angles vs. Competitors
1. **[Angle]:** [Why this wins and how to own it — specific tactics]
2. **[Angle]:** [Why this wins and how to own it]
3. **[Angle]:** [Why this wins and how to own it]

---

## 📋 6 Recommended Content Pillars (30–90 Day LinkedIn Strategy)
| Pillar | Theme | Why It Works | Posting Frequency |
|--------|-------|-------------|-------------------|
[6 rows — specific pillars tied to market and audience data]

---

## 🎨 Top 3 Content Formats for This Audience
1. **[Format]:** [Why it works for this specific audience + specific data point + how to execute it]
2. **[Format]:** [Why it works + data + execution]
3. **[Format]:** [Why it works + data + execution]

---

## ⚡ 5 Immediate Actions (This Week)
1. [Specific, concrete action with expected result and metric]
2. [Specific, concrete action with expected result and metric]
3. [Specific, concrete action with expected result and metric]
4. [Specific, concrete action with expected result and metric]
5. [Specific, concrete action with expected result and metric]

---

## 📈 90-Day Growth Framework
| Phase | Weeks | Focus | Target Metric |
|-------|-------|-------|--------------|
| Foundation | 1–4 | [focus] | [metric] |
| Momentum | 5–8 | [focus] | [metric] |
| Scale | 9–12 | [focus] | [metric] |

---
*Generated by Pipeline 1 · Claude Sonnet · ${date}*`, 2000);
}

// ─── POST handler ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { niche, icpSummary, competitors } = await request.json();
    if (!niche || !icpSummary) {
      return new Response(JSON.stringify({ error: 'Niche and ICP summary are required' }), { status: 400 });
    }

    const competitorList = Array.isArray(competitors)
      ? competitors.filter(Boolean).join(', ') || 'Not specified'
      : String(competitors || 'Not specified');

    const runId = `research-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          send('Initializing Pipeline 1: Market, Audience & Competitor Research...');
          send(`Niche: ${niche}`);
          send(`ICP: ${icpSummary.slice(0, 120)}...`);
          send(`Competitors: ${competitorList}`);
          send('');

          await waitWhilePaused(runId, send);

          // Step 1 — Market Research
          send('Step 1/5 — Market intelligence (4 Perplexity queries + Claude synthesis)...');
          send('  · Querying LinkedIn algorithm signals 2026...');
          send('  · Querying content format engagement benchmarks...');
          send('  · Querying market trends and white space...');
          send('  · Querying service pricing intelligence...');
          let marketReport: string;
          try {
            marketReport = await runMarketResearch(niche, icpSummary);
          } catch (err: any) {
            send(`  ⚠️ Perplexity unavailable — switching to Claude analysis...`);
            marketReport = await runMarketResearchFallback(niche, icpSummary);
          }
          send('✅ Market research complete');

          await waitWhilePaused(runId, send);

          // Step 2 — Audience Research
          send('');
          send('Step 2/5 — ICP & audience intelligence (3 Perplexity queries + Claude synthesis)...');
          send('  · Querying audience pain points and challenges...');
          send('  · Querying LinkedIn behavioral patterns...');
          send('  · Querying buying behavior and decision triggers...');
          let audienceReport: string;
          try {
            audienceReport = await runAudienceResearch(niche, icpSummary);
          } catch (err: any) {
            send(`  ⚠️ Perplexity unavailable — switching to Claude analysis...`);
            audienceReport = await runAudienceResearchFallback(niche, icpSummary);
          }
          send('✅ Audience research complete');

          await waitWhilePaused(runId, send);

          // Step 3 — Competitor Research
          send('');
          send('Step 3/5 — Competitor intelligence (Perplexity queries + Claude synthesis)...');
          send(`  · Analyzing competitive landscape for ${niche}...`);
          let competitorReport: string;
          try {
            competitorReport = await runCompetitorResearch(niche, competitorList);
          } catch (err: any) {
            send(`  ⚠️ Perplexity unavailable — switching to Claude analysis...`);
            competitorReport = await runCompetitorResearchFallback(niche, competitorList);
          }
          send('✅ Competitor intelligence complete');

          await waitWhilePaused(runId, send);

          // Step 4 — Executive Summary
          send('');
          send('Step 4/5 — Synthesizing executive summary and strategic priorities...');
          const executiveSummary = await runExecutiveSummary(
            niche, icpSummary, marketReport, audienceReport, competitorReport,
          );
          send('✅ Executive summary synthesized');

          // Step 5 — Save to Notion
          send('');
          send('Step 5/5 — Building structured Notion research sprint...');
          try {
            const sprint = await saveResearchSprint({
              niche, icpSummary, marketReport, audienceReport,
              competitorReport, executiveSummary,
              competitors: competitorList, totalQueries: 10,
            });

            // Also save DB records so dashboard records stay up to date
            await Promise.all([
              saveResearchOutput({ section: 'Market', content: marketReport.slice(0, 1990), niche }),
              saveResearchOutput({ section: 'Audience', content: audienceReport.slice(0, 1990), niche }),
              saveResearchOutput({ section: 'Competitor', content: competitorReport.slice(0, 1990), niche }),
              saveResearchOutput({ section: 'Executive Summary', content: executiveSummary.slice(0, 1990), niche }),
            ]);

            send('✅ Research sprint saved to Notion');
            send('');
            send(`📋 Sprint: ${sprint.masterUrl}`);
            send(`📈 Market: ${sprint.childUrls.market}`);
            send(`🎯 Audience: ${sprint.childUrls.audience}`);
            send(`🕵️ Competitor: ${sprint.childUrls.competitor}`);
            send(`📊 Summary: ${sprint.childUrls.summary}`);

            await logActivity({
              title: 'Research sprint completed',
              description: `Niche: ${niche} — 5 structured pages created`,
              pipeline: 'Research',
              type: 'success',
            });
          } catch (err: any) {
            send('⚠️ Notion save encountered an issue');
            console.error('[research] Notion save failed:', err.message);
          }

          send('');
          send('─────── RESEARCH SPRINT COMPLETE ───────────');
          send('Pipeline 1 finished. Run Pipeline 2 (Content Strategy) to build your strategy.');

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          if (err.message === 'PIPELINE_STOPPED') {
            send('⏹  Pipeline stopped by user');
          } else {
            send(`❌ Error: ${err.message}`);
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
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
