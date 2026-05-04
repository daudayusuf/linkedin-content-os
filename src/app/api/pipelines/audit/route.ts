import Anthropic from '@anthropic-ai/sdk';
import { tasks } from '@trigger.dev/sdk/v3';
import { saveAuditReport } from '@/lib/notion';
import { createRun, deleteRun, waitWhilePaused, buildDirectiveContext } from '@/lib/pipeline-state';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractUsername(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1].replace(/\/$/, '') : url;
}

export async function POST(request: Request) {
  try {
    const { targetUrl, prospectEmail, prospectName } = await request.json();
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Target URL is required' }), { status: 400 });
    }

    // Generate a unique run ID for task control
    const runId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        // Send the runId as the very first event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          const username = extractUsername(targetUrl);
          send(`Initializing Pipeline 5: LinkedIn Audit & Strategy...`);
          send(`Target profile: linkedin.com/in/${username}`);
          send('');

          // === Check for pause/stop before Step 1 ===
          await waitWhilePaused(runId, send);

          send('Step 1/5 — Fetching profile data via ScrapingDog...');

          // ── Step 1: Fetch LinkedIn profile ─────────────────────────────────
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
              send(`  Headline: ${profileData?.headline || 'N/A'}`);
              send(`  Followers: ${profileData?.followers || profileData?.connections || 'N/A'}`);
            } else {
              send(`⚠ Profile fetch returned ${profileRes.status}. Proceeding with URL-only context.`);
            }
          } catch (e: any) {
            send(`⚠ Could not fetch profile (${e.message}). Proceeding with URL-only context.`);
          }

          // === Check for pause/stop before Step 2 ===
          await waitWhilePaused(runId, send);

          // ── Step 2: Fetch recent posts ──────────────────────────────────────
          send('');
          send('Step 2/5 — Fetching recent posts via RapidAPI...');
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
              postsData = raw?.data || raw?.posts || (Array.isArray(raw) ? raw : []);
              send(`✓ Fetched ${postsData.length} recent posts.`);
            } else {
              send(`⚠ Posts fetch returned ${postsRes.status}. Analysis will use profile data only.`);
            }
          } catch (e: any) {
            send(`⚠ Could not fetch posts (${e.message}). Analysis will use profile data only.`);
          }

          // === Check for pause/stop before Step 3 ===
          await waitWhilePaused(runId, send);

          // ── Step 3: Claude Analysis ─────────────────────────────────────────
          send('');
          send('Step 3/5 — Scoring profile across 6 dimensions...');

          const profileContext = profileData
            ? `Full Name: ${profileData.fullName || 'Unknown'}
Headline: ${profileData.headline || 'N/A'}
About/Summary: ${(profileData.about || profileData.summary || 'N/A').slice(0, 500)}
Followers: ${profileData.followers || profileData.connections || 'N/A'}
Location: ${profileData.location || 'N/A'}
Current Role: ${profileData.currentPosition?.[0]?.title || 'N/A'} at ${profileData.currentPosition?.[0]?.companyName || 'N/A'}`
            : `LinkedIn URL: ${targetUrl}\nUsername: ${username}`;

          const postsContext = postsData.length > 0
            ? postsData.slice(0, 10).map((p: any, i: number) => {
                const text = (p.text || p.content || p.commentary || '').slice(0, 300);
                const likes = p.totalReactionCount || p.likes || p.likeCount || 0;
                const comments = p.commentsCount || p.comments || 0;
                return `Post ${i + 1}: "${text}" | Likes: ${likes} | Comments: ${comments}`;
              }).join('\n')
            : 'No posts fetched — base analysis on profile data and URL only.';

          const directiveCtx1 = buildDirectiveContext(runId);
          const analysisResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2500,
            messages: [
              {
                role: 'user',
                content: `You are an elite LinkedIn content strategist auditing a profile for Daud Yusuf's lead magnet service.

PROFILE DATA:
${profileContext}

RECENT POSTS (up to 10):
${postsContext}
${directiveCtx1}
Perform a full 6-dimension LinkedIn audit. For each dimension, give a score out of 10, a one-sentence observation, and one specific improvement action.

DIMENSIONS TO SCORE:
1. Profile Optimization (headline, about, banner, photo)
2. Content Quality (hooks, formatting, value delivery)
3. Posting Consistency (frequency, scheduling patterns)
4. Engagement Rate (likes/comments relative to followers)
5. Niche Authority (clear positioning, expertise signals)
6. Call-to-Action Clarity (lead generation, DM funnel)

Then:
- Calculate overall score (weighted average) and letter grade (A=90+, B=75+, C=60+, D=45+, F=below)
- Identify the #1 biggest leverage point (what single change would move the needle most)
- Write a 3-sentence "Executive Summary" for this profile

FORMAT YOUR RESPONSE EXACTLY AS:
DIMENSION SCORES
1. Profile Optimization: X/10 — [observation] → [action]
2. Content Quality: X/10 — [observation] → [action]
3. Posting Consistency: X/10 — [observation] → [action]
4. Engagement Rate: X/10 — [observation] → [action]
5. Niche Authority: X/10 — [observation] → [action]
6. CTA Clarity: X/10 — [observation] → [action]

OVERALL SCORE: XX/100 — Grade [X]

#1 LEVERAGE POINT:
[Specific high-impact improvement]

EXECUTIVE SUMMARY:
[3 sentences]`,
              },
            ],
          });

          const analysis = analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text : '';

          send('');
          send('════════════════ AUDIT RESULTS ════════════════');
          for (const line of analysis.split('\n')) send(line);
          send('════════════════════════════════════════════════');

          // === Check for pause/stop before Step 4 ===
          await waitWhilePaused(runId, send);

          // ── Step 4: 30-day strategy ─────────────────────────────────────────
          send('');
          send('Step 4/5 — Generating 30-day content strategy...');

          const directiveCtx2 = buildDirectiveContext(runId);
          const strategyResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [
              {
                role: 'user',
                content: `Based on the LinkedIn profile audit for ${profileData?.fullName || username}, create a focused 30-day content strategy.

PROFILE CONTEXT: ${profileContext}
AUDIT SUMMARY: ${analysis.split('EXECUTIVE SUMMARY:')[1]?.slice(0, 300) || 'Profile needs improvement across all dimensions.'}
${directiveCtx2}
Generate a 30-day content plan with:
- Week 1 focus theme and 3 post ideas
- Week 2 focus theme and 3 post ideas
- Week 3 focus theme and 3 post ideas
- Week 4 focus theme and 3 post ideas
- 3 engagement actions to take every day (commenting, DMs, etc.)
- Top 3 hashtag clusters to target

Keep each post idea as a specific, actionable hook (under 15 words). Format clearly with headers.`,
              },
            ],
          });

          const strategy = strategyResponse.content[0].type === 'text' ? strategyResponse.content[0].text : '';

          send('');
          send('════════════════ 30-DAY STRATEGY ═══════════════');
          for (const line of strategy.split('\n')) send(line);
          send('════════════════════════════════════════════════');

          // === Check for pause/stop before Step 5 ===
          await waitWhilePaused(runId, send);

          // ── Step 5: Save to Notion ──────────────────────────────────────────
          send('');
          send('Step 5/5 — Saving report to Notion...');

          const scoreMatch = analysis.match(/OVERALL SCORE:\s*(\d+)\/100/);
          const gradeMatch = analysis.match(/Grade\s+([A-F])/);
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
          const grade = gradeMatch ? gradeMatch[1] : 'N/A';

          try {
            await saveAuditReport({
              profileName: profileData?.fullName || username,
              profileUrl: targetUrl,
              score,
              grade,
              analysis,
              strategy,
            });
            send(`✅ Audit complete for ${profileData?.fullName || username} — saved to Notion (Score: ${score}/100, Grade ${grade})`);
          } catch (notionErr: any) {
            send(`✅ Audit complete for ${profileData?.fullName || username}`);
            console.error('[audit] Notion save failed:', notionErr.message);
          }

          if (prospectEmail) {
            send('Dispatching email delivery via background job...');
            try {
              await tasks.trigger('linkedin-audit-bot', {
                url: targetUrl,
                prospectEmail,
                prospectName: profileData?.fullName || username,
              });
              send(`✅ Audit report will be emailed to ${prospectEmail}`);
            } catch (triggerErr: any) {
              send('⚠ Email dispatch failed — report saved to Notion only.');
              console.error('[audit] Trigger.dev dispatch failed:', triggerErr.message);
            }
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
