import Anthropic from '@anthropic-ai/sdk';
import { tasks } from '@trigger.dev/sdk/v3';
import { publishAuditReport } from '@/lib/notion-audit';
import { createRun, deleteRun, waitWhilePaused, buildDirectiveContext } from '@/lib/pipeline-state';
import { fetchChartBuffers } from '@/lib/charts';
import { generateAuditPdfBuffer } from '@/lib/pdf-generator';
import { sendAuditEmail } from '@/lib/send-audit-email';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractUsername(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1].replace(/\/$/, '') : url;
}

// ── Types matching the Lead Magnet's audit_analysis.json schema ────────────

interface DimensionScore {
  score: number;
  max: number;
  rationale: string;
}

interface PostRating {
  post_index: number;
  hook_text: string;
  hook_score: number;
  hook_judgment: string;
  has_cta: boolean;
  content_pillar: string;
  likes: number;
  comments: number;
  post_url: string;
  standout_reason: string;
}

interface PostIdea {
  number: number;
  pillar: string;
  format: string;
  hook: string;
  key_points: string[];
  cta: string;
  why_it_works: string;
  content_gap_it_fills: string;
}

interface AuditAnalysis {
  prospect: { name: string; headline: string; profile_url: string; niche: string; goal: string };
  overall_score: number;
  grade: string;
  grade_label: string;
  percentile: string;
  dimension_scores: {
    profile_health: DimensionScore;
    hook_strength: DimensionScore;
    cta_clarity: DimensionScore;
    content_pillar_balance: DimensionScore;
    posting_frequency: DimensionScore;
    engagement_quality: DimensionScore;
  };
  benchmarks: {
    your_engagement_rate: number;
    top_10_engagement_rate: number;
    median_engagement_rate: number;
    your_posts_per_week: number;
    top_10_posts_per_week: number;
    median_posts_per_week: number;
    your_hook_avg: number;
    top_10_hook_avg: number;
    median_hook_avg: number;
    your_comment_like_ratio: number;
    top_10_comment_like_ratio: number;
  };
  content_pillars: { educational: number; personal_story: number; promotional: number; engagement: number };
  post_ratings: PostRating[];
  top_performing_posts: number[];
  weakest_posts: number[];
  key_insights: string[];
  biggest_content_gap: string;
  hook_rewrite_example: { original: string; rewrite: string; why_better: string };
  engagement_metrics: { avg_likes: number; avg_comments: number; avg_comment_like_ratio: number; total_posts_analyzed: number };
  action_items: string[];
  executive_summary: string;
}

export async function POST(request: Request) {
  try {
    const { targetUrl, prospectName, prospectEmail, goal = 'attract-clients', niche = 'business-coach' } = await request.json();
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Target URL is required' }), { status: 400 });
    }
    if (!prospectName) {
      return new Response(JSON.stringify({ error: 'Prospect name is required' }), { status: 400 });
    }

    const runId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          const username = extractUsername(targetUrl);
          const firstName = prospectName.split(' ').pop()?.includes('.') 
            ? prospectName.split(' ').filter((w: string) => !w.includes('.')).pop() || prospectName.split(' ')[0]
            : prospectName.split(' ')[0];

          send(`Initializing LinkedIn Audit & Strategy Pipeline...`);
          send(`Target: ${prospectName} (linkedin.com/in/${username})`);
          send(`Goal: ${goal} | Niche: ${niche}`);
          send('');

          // ════════════════════════════════════════════════════════════════════
          // STEP 1: Fetch LinkedIn Profile
          // ════════════════════════════════════════════════════════════════════
          await waitWhilePaused(runId, send);
          send('Step 1/7 — Fetching profile data via ScrapingDog...');

          let profileData: any = null;
          try {
            const profileRes = await fetch(
              `https://api.scrapingdog.com/linkedin?api_key=${process.env.SCRAPINGDOG_API_KEY}&type=profile&linkId=${username}`,
              { signal: AbortSignal.timeout(20000) }
            );
            if (profileRes.ok) {
              const raw = await profileRes.json();
              profileData = Array.isArray(raw) ? raw[0] : raw;
              send(`✓ Profile fetched: ${profileData?.fullName || username}`);
              send(`  Headline: ${profileData?.headline || '(blank)'}`);
              send(`  Followers: ${profileData?.followers || profileData?.connections || 'N/A'}`);
              send(`  Location: ${profileData?.location || 'N/A'}`);
            } else {
              send(`⚠ Profile fetch returned ${profileRes.status}. Proceeding with URL-only context.`);
            }
          } catch (e: any) {
            send(`⚠ Could not fetch profile (${e.message}). Proceeding with URL-only context.`);
          }

          // ════════════════════════════════════════════════════════════════════
          // STEP 2: Fetch Recent Posts
          // ════════════════════════════════════════════════════════════════════
          await waitWhilePaused(runId, send);
          send('');
          send('Step 2/7 — Fetching recent posts via RapidAPI...');

          let postsData: any[] = [];
          try {
            const postsRes = await fetch(
              `https://fresh-linkedin-profile-data.p.rapidapi.com/get-profile-posts?linkedin_url=${encodeURIComponent(targetUrl)}&type=posts`,
              {
                headers: {
                  'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
                  'x-rapidapi-host': 'fresh-linkedin-profile-data.p.rapidapi.com',
                },
                signal: AbortSignal.timeout(20000),
              }
            );
            if (postsRes.ok) {
              const raw = await postsRes.json();
              const allPosts = raw?.data || raw?.posts || (Array.isArray(raw) ? raw : []);
              // Filter out reposts/reshares
              postsData = allPosts.filter((p: any) => !p.reshared).slice(0, 10);
              send(`✓ Fetched ${postsData.length} original posts (filtered reshares).`);
              if (postsData.length < 3) {
                send(`⚠ Low post count (${postsData.length}) — accuracy may be limited.`);
              }
            } else {
              send(`⚠ Posts fetch returned ${postsRes.status}. Analysis will use profile data only.`);
            }
          } catch (e: any) {
            send(`⚠ Could not fetch posts (${e.message}). Analysis will use profile data only.`);
          }

          // ════════════════════════════════════════════════════════════════════
          // STEP 3: Structured 6-Dimension Analysis (Claude)
          // ════════════════════════════════════════════════════════════════════
          await waitWhilePaused(runId, send);
          send('');
          send('Step 3/7 — Running structured 6-dimension analysis...');

          const profileContext = profileData
            ? `Full Name: ${profileData.fullName || 'Unknown'}
Headline: ${profileData.headline || '(blank)'}
About/Summary: ${(profileData.about || profileData.summary || 'N/A').slice(0, 800)}
Followers: ${profileData.followers || profileData.connections || 'N/A'}
Location: ${profileData.location || 'N/A'}
Current Role: ${profileData.currentPosition?.[0]?.title || 'N/A'} at ${profileData.currentPosition?.[0]?.companyName || 'N/A'}
Profile URL: ${targetUrl}`
            : `LinkedIn URL: ${targetUrl}\nUsername: ${username}\nNo profile data available — score conservatively.`;

          const postsContext = postsData.length > 0
            ? postsData.map((p: any, i: number) => {
                const text = (p.text || p.content || p.commentary || '').slice(0, 500);
                const likes = p.totalReactionCount || p.likes || p.likeCount || 0;
                const comments = p.commentsCount || p.comments || 0;
                const url = p.postUrl || p.url || '';
                return `POST ${i + 1}:\nText: "${text}"\nLikes: ${likes} | Comments: ${comments}\nURL: ${url}`;
              }).join('\n\n')
            : 'No posts fetched — base analysis on profile data and URL only. Score posting_frequency and content dimensions conservatively.';

          const directiveCtx1 = buildDirectiveContext(runId);
          const analysisPrompt = `You are an elite LinkedIn content strategist performing a comprehensive audit for Daud Yusuf's lead magnet service.

PROSPECT: ${prospectName}
NICHE: ${niche}
GOAL: ${goal}

PROFILE DATA:
${profileContext}

RECENT POSTS (up to 10 original posts, reshares filtered out):
${postsContext}
${directiveCtx1}

Perform a FULL structured LinkedIn audit. You MUST return ONLY valid JSON matching this exact schema — no markdown, no explanation, no text outside the JSON:

{
  "overall_score": <0-100 integer — weighted sum of dimensions>,
  "grade": "<A|B|C|D|F>",
  "grade_label": "<Excellent|Very Good|Needs Work|Poor|Critical>",
  "percentile": "<e.g. 'top 70%'>",
  "dimension_scores": {
    "profile_health": { "score": <0-20>, "max": 20, "rationale": "<2-3 sentences citing specific profile elements>" },
    "hook_strength": { "score": <0-20>, "max": 20, "rationale": "<2-3 sentences citing specific posts>" },
    "cta_clarity": { "score": <0-15>, "max": 15, "rationale": "<2-3 sentences, cite how many posts have CTAs>" },
    "content_pillar_balance": { "score": <0-15>, "max": 15, "rationale": "<2-3 sentences with % breakdown>" },
    "posting_frequency": { "score": <0-15>, "max": 15, "rationale": "<2-3 sentences about cadence>" },
    "engagement_quality": { "score": <0-15>, "max": 15, "rationale": "<2-3 sentences with engagement rate data>" }
  },
  "benchmarks": {
    "your_engagement_rate": <number>,
    "top_10_engagement_rate": 4.5,
    "median_engagement_rate": 2.0,
    "your_posts_per_week": <number>,
    "top_10_posts_per_week": 5.0,
    "median_posts_per_week": 2.5,
    "your_hook_avg": <number — average of all post hook_scores>,
    "top_10_hook_avg": 8.2,
    "median_hook_avg": 5.5,
    "your_comment_like_ratio": <number>,
    "top_10_comment_like_ratio": 0.25
  },
  "content_pillars": {
    "educational": <0-100 integer — percentage>,
    "personal_story": <0-100>,
    "promotional": <0-100>,
    "engagement": <0-100>
  },
  "post_ratings": [
    {
      "post_index": <0-based>,
      "hook_text": "<first line of post, max 100 chars>",
      "hook_score": <1-10>,
      "hook_judgment": "<Weak|Average|Strong|Excellent>",
      "has_cta": <boolean>,
      "content_pillar": "<Educational|Personal Story|Promotional|Engagement>",
      "likes": <number>,
      "comments": <number>,
      "post_url": "<URL if available>",
      "standout_reason": "<1-2 sentences explaining performance>"
    }
  ],
  "top_performing_posts": [<indices of top 2 posts by engagement>],
  "weakest_posts": [<indices of bottom 2 posts>],
  "key_insights": [
    "<insight 1 — data-backed, cite specific numbers>",
    "<insight 2 — cite specific posts or patterns>",
    "<insight 3 — cite specific gaps>"
  ],
  "biggest_content_gap": "<1-2 sentences identifying the single biggest gap>",
  "hook_rewrite_example": {
    "original": "<worst hook from the posts>",
    "rewrite": "<improved version targeting the prospect's niche/goal>",
    "why_better": "<1-2 sentences>"
  },
  "engagement_metrics": {
    "avg_likes": <number>,
    "avg_comments": <number>,
    "avg_comment_like_ratio": <number>,
    "total_posts_analyzed": <number>
  },
  "action_items": [
    "<action 1 — specific, data-backed, cite a number from the audit>",
    "<action 2>",
    "<action 3>",
    "<action 4>",
    "<action 5>"
  ],
  "executive_summary": "<3-4 sentences addressing ${prospectName} by first name in second person. Summarize score, top strength, top gaps, and what the 30-day plan addresses.>"
}

SCORING RULES:
- Profile Health (max 20): Headline, About, Featured, Banner, Photo, CTA in bio
- Hook Strength (max 20): First line of every post — specificity, curiosity, pattern interrupt
- CTA Clarity (max 15): Percentage of posts with a clear directive CTA
- Content Pillar Balance (max 15): Distribution vs ideal 40% educational / 30% personal / 20% promotional / 10% engagement
- Posting Frequency (max 15): Posts per week cadence vs benchmark
- Engagement Quality (max 15): Engagement rate vs benchmark, comment depth

GRADING: A=90+, B=75+, C=60+, D=45+, F=below 45

LANGUAGE RULES (non-negotiable):
- Address ${prospectName} by first name (${firstName}) in second person throughout
- Use "you/your" — NEVER "she/her/he/his/they"
- Write plain, direct sentences that cite specific data
- Never use: "unpopular opinion", "harsh truth", "hot take", "let's be honest", "it's worth noting"
- No generic encouragement like "Keep up the great work!"

Return ONLY the JSON object. No markdown fences, no explanation.`;

          const analysisResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [{ role: 'user', content: analysisPrompt }],
          });

          const analysisRaw = analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text : '';
          let analysis: AuditAnalysis;
          try {
            // Strip markdown fences if Claude added them
            const cleaned = analysisRaw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
            analysis = JSON.parse(cleaned);
          } catch (parseErr: any) {
            send(`⚠ Analysis JSON parse failed, retrying with repair...`);
            // Retry once with explicit instruction
            const retryRes = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 4000,
              messages: [
                { role: 'user', content: analysisPrompt },
                { role: 'assistant', content: analysisRaw },
                { role: 'user', content: 'Your response was not valid JSON. Return ONLY the JSON object — no markdown fences, no explanation text. Fix any syntax errors.' },
              ],
            });
            const retryRaw = retryRes.content[0].type === 'text' ? retryRes.content[0].text : '';
            const retryCleaned = retryRaw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
            analysis = JSON.parse(retryCleaned);
          }

          // Attach prospect metadata
          analysis.prospect = {
            name: prospectName,
            headline: profileData?.headline || '',
            profile_url: targetUrl,
            niche,
            goal,
          };

          send(`✓ Analysis complete — Score: ${analysis.overall_score}/100, Grade ${analysis.grade}`);
          send(`  ${analysis.grade_label} — ${analysis.percentile} of creators in ${niche} niche`);
          send('');

          // Print dimension scores to terminal
          send('════════════════ DIMENSION SCORES ════════════════');
          const dims = analysis.dimension_scores;
          send(`  Profile Health:       ${dims.profile_health.score}/${dims.profile_health.max}`);
          send(`  Hook Strength:        ${dims.hook_strength.score}/${dims.hook_strength.max}`);
          send(`  CTA Clarity:          ${dims.cta_clarity.score}/${dims.cta_clarity.max}`);
          send(`  Content Pillar Mix:   ${dims.content_pillar_balance.score}/${dims.content_pillar_balance.max}`);
          send(`  Posting Frequency:    ${dims.posting_frequency.score}/${dims.posting_frequency.max}`);
          send(`  Engagement Quality:   ${dims.engagement_quality.score}/${dims.engagement_quality.max}`);
          send('══════════════════════════════════════════════════');
          send('');

          // Print key insights
          send('Key Insights:');
          for (const insight of analysis.key_insights) {
            send(`  • ${insight.slice(0, 150)}${insight.length > 150 ? '...' : ''}`);
          }
          send('');

          // ════════════════════════════════════════════════════════════════════
          // STEP 4: Generate 10 Post Ideas (Claude)
          // ════════════════════════════════════════════════════════════════════
          await waitWhilePaused(runId, send);
          send('Step 4/7 — Generating 10 tailored post ideas...');

          const directiveCtx2 = buildDirectiveContext(runId);
          const postIdeasPrompt = `You are generating 10 post ideas for ${prospectName}, a ${niche} whose goal is to ${goal.replace(/-/g, ' ')}.

AUDIT FINDINGS (ground every idea in these):
- Overall Score: ${analysis.overall_score}/100 (Grade ${analysis.grade})
- Content Pillars: ${analysis.content_pillars.educational}% Educational, ${analysis.content_pillars.personal_story}% Personal Story, ${analysis.content_pillars.promotional}% Promotional, ${analysis.content_pillars.engagement}% Engagement
- Biggest Gap: ${analysis.biggest_content_gap}
- Key Insights: ${analysis.key_insights.join(' | ')}
- Weakest Areas: ${Object.entries(analysis.dimension_scores).filter(([_, v]) => v.score / v.max < 0.5).map(([k, v]) => `${k}: ${v.score}/${v.max}`).join(', ')}
${directiveCtx2}

Generate EXACTLY 10 post ideas as a JSON array. Distribution: 4 Educational, 3 Personal Story, 2 Promotional, 1 Engagement.

EVERY idea must reference a specific weakness, gap, or insight from the audit findings above. Generic ideas that could apply to anyone are not acceptable.

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "number": 1,
    "pillar": "<Educational|Personal Story|Promotional|Engagement>",
    "format": "<e.g. 'Industry observation + unique angle', 'Personal failure + lessons learned', 'FAQ post', 'Case study', etc.>",
    "hook": "<The opening line of the post — specific, scroll-stopping, under 120 chars>",
    "key_points": ["<talking point 1>", "<talking point 2>", "<talking point 3>"],
    "cta": "<Specific CTA — DM prompt, comment keyword, link, or qualifying question>",
    "why_it_works": "<1-2 sentences explaining why this post addresses a specific audit finding>",
    "content_gap_it_fills": "<Name the specific audit finding this addresses>"
  }
]

LANGUAGE RULES: No "unpopular opinion", "harsh truth", "hot take", "let's be honest". Write natural, human hooks. Use second person.`;

          const ideasResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            messages: [{ role: 'user', content: postIdeasPrompt }],
          });

          const ideasRaw = ideasResponse.content[0].type === 'text' ? ideasResponse.content[0].text : '';
          let postIdeas: PostIdea[] = [];
          try {
            const cleaned = ideasRaw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
            postIdeas = JSON.parse(cleaned);
          } catch (e1: any) {
            send(`⚠ Post ideas parse failed — attempting repair...`);
            try {
              const retryRes = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 4000,
                messages: [
                  { role: 'user', content: postIdeasPrompt },
                  { role: 'assistant', content: ideasRaw },
                  { role: 'user', content: 'Your response was not valid JSON. Return ONLY the JSON array — no markdown fences, no explanation text. Fix any syntax errors.' },
                ],
              });
              const retryRaw = retryRes.content[0].type === 'text' ? retryRes.content[0].text : '';
              const retryCleaned = retryRaw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
              postIdeas = JSON.parse(retryCleaned);
            } catch (e2: any) {
              send(`⚠ Repair failed. Proceeding with empty post ideas list.`);
              postIdeas = [];
            }
          }

          send(`✓ Generated ${postIdeas.length} post ideas`);
          const pillarCounts: Record<string, number> = {};
          for (const idea of postIdeas) {
            pillarCounts[idea.pillar] = (pillarCounts[idea.pillar] || 0) + 1;
          }
          send(`  Distribution: ${Object.entries(pillarCounts).map(([k, v]) => `${k}: ${v}`).join(' | ')}`);
          send('');

          // ════════════════════════════════════════════════════════════════════
          // STEP 5: Generate 30-Day Content Strategy (Claude)
          // ════════════════════════════════════════════════════════════════════
          await waitWhilePaused(runId, send);
          send('Step 5/7 — Generating 30-day content strategy...');

          const directiveCtx3 = buildDirectiveContext(runId);
          const strategyResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [
              {
                role: 'user',
                content: `Based on the LinkedIn profile audit for ${prospectName} (${niche}, goal: ${goal}), create a focused 30-day content strategy.

AUDIT CONTEXT:
- Score: ${analysis.overall_score}/100, Grade ${analysis.grade}
- Biggest Gap: ${analysis.biggest_content_gap}
- Content Pillars: ${analysis.content_pillars.educational}% Educational, ${analysis.content_pillars.personal_story}% Personal Story, ${analysis.content_pillars.promotional}% Promotional
- Executive Summary: ${analysis.executive_summary}
${directiveCtx3}

Generate a 30-day plan addressing the audit gaps:
- Week 1 focus theme and 3 post ideas (with hooks)
- Week 2 focus theme and 3 post ideas
- Week 3 focus theme and 3 post ideas
- Week 4 focus theme and 3 post ideas
- 3 daily engagement actions (commenting, DMs, etc.)
- Top 3 hashtag clusters to target

The strategy must be a rehabilitation plan: if educational content is 0%, week 1 should lead with Educational posts. Each week's theme should be informed by the audit's key insights.

Keep each post idea as a specific, actionable hook (under 15 words). Format clearly with headers.`,
              },
            ],
          });

          const strategy = strategyResponse.content[0].type === 'text' ? strategyResponse.content[0].text : '';

          send('✓ 30-day strategy generated');
          send('');

          // ════════════════════════════════════════════════════════════════════
          // STEP 6: Save to Notion (Rich Page)
          // ════════════════════════════════════════════════════════════════════
          await waitWhilePaused(runId, send);
          send('Step 6/7 — Building rich Notion report page...');

          try {
            const notionResult = await publishAuditReport({
              analysis,
              postIdeas,
              strategy,
              onProgress: send,
            });
            send(`✅ Audit saved to Notion — ${notionResult.pageUrl}`);
            send(`  Score: ${analysis.overall_score}/100, Grade ${analysis.grade} (${analysis.grade_label})`);
          } catch (notionErr: any) {
            send(`⚠ Notion save failed: ${notionErr.message}`);
            console.error('[audit] Notion save failed:', notionErr.message);
          }

          // ════════════════════════════════════════════════════════════════════
          // STEP 7: Generate PDF & Email Report
          // ════════════════════════════════════════════════════════════════════
          if (prospectEmail) {
            await waitWhilePaused(runId, send);
            send('');
            send('Step 7/8 — Generating 12-page PDF report with charts...');
            
            let pdfBase64 = '';
            try {
              const chartBuffers = await fetchChartBuffers(analysis);
              send('  ✓ Charts generated successfully');
              
              const pdfBuffer = await generateAuditPdfBuffer(analysis, postIdeas, chartBuffers);
              pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
              send('  ✓ PDF report built successfully');
            } catch (pdfErr: any) {
              send(`⚠ PDF generation failed: ${pdfErr.message}`);
              console.error('[audit] PDF generation failed:', pdfErr.message);
            }

            send('');
            send('Step 8/8 — Dispatching audit report email...');
            try {
              await sendAuditEmail({
                prospectEmail,
                prospectName,
                firstName,
                analysis: {
                  overall_score: analysis.overall_score,
                  grade: analysis.grade,
                  grade_label: analysis.grade_label,
                  executive_summary: analysis.executive_summary,
                  dimension_scores: analysis.dimension_scores,
                  key_insights: analysis.key_insights,
                  action_items: analysis.action_items,
                  post_count: postIdeas.length,
                },
                pdfAttachmentBase64: pdfBase64,
              });
              send(`✅ Audit report successfully emailed to ${prospectEmail}`);
            } catch (emailErr: any) {
              send('⚠ Email dispatch failed — report saved to Notion only.');
              console.error('[audit] Email dispatch failed:', emailErr.message);
            }
          } else {
            send('');
            send('Step 7/8 — No email address provided, skipping PDF generation and email delivery.');
          }

          send('');
          send('════════════════════════════════════════════════════');
          send(`✅ AUDIT COMPLETE — ${prospectName}`);
          send(`   Score: ${analysis.overall_score}/100 | Grade: ${analysis.grade} (${analysis.grade_label})`);
          send(`   ${analysis.percentile} of creators in ${niche} niche`);
          send(`   Posts analyzed: ${analysis.engagement_metrics.total_posts_analyzed}`);
          send(`   Post ideas generated: ${postIdeas.length}`);
          send(`   #1 Leverage Point: ${analysis.biggest_content_gap.slice(0, 120)}...`);
          send('════════════════════════════════════════════════════');

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
