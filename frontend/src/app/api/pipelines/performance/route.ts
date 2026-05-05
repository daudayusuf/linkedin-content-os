import Anthropic from '@anthropic-ai/sdk';
import { savePerformanceSnapshot } from '@/lib/notion';
import { createRun, deleteRun, waitWhilePaused, buildDirectiveContext } from '@/lib/pipeline-state';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function prevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request: Request) {
  try {
    const { targetMonth: rawMonth } = await request.json();
    const targetMonth: string = rawMonth || prevMonth();

    const username = process.env.MY_LINKEDIN_USERNAME || '';
    if (!username) {
      return new Response(JSON.stringify({ error: 'MY_LINKEDIN_USERNAME is not set in environment' }), { status: 500 });
    }

    // Generate a unique run ID for task control
    const runId = `performance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        // Send the runId as the very first event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          send(`Initializing Pipeline 5b: Performance Analysis — ${targetMonth}`);
          send(`LinkedIn profile: linkedin.com/in/${username}`);
          send('');

          // === Check for pause/stop before Step 1 ===
          await waitWhilePaused(runId, send);

          // ── Step 1: Fetch profile (follower count) ────────────────────────
          send('Step 1/4 — Fetching profile data...');
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
              send(`  Followers: ${profileData?.followers || profileData?.connections || 'N/A'}`);
              send(`  Headline: ${profileData?.headline || 'N/A'}`);
            } else {
              send(`⚠ Profile fetch returned ${profileRes.status} — continuing without follower data.`);
            }
          } catch (e: any) {
            send(`⚠ Could not fetch profile (${e.message}) — continuing without follower data.`);
          }

          // === Check for pause/stop before Step 2 ===
          await waitWhilePaused(runId, send);

          // ── Step 2: Fetch posts ───────────────────────────────────────────
          send('');
          send('Step 2/4 — Fetching recent posts via RapidAPI...');
          let allPosts: any[] = [];
          try {
            const postsRes = await fetch(
              `https://fresh-linkedin-profile-data.p.rapidapi.com/get-profile-posts?linkedin_url=https://www.linkedin.com/in/${username}&type=posts`,
              {
                headers: {
                  'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
                  'x-rapidapi-host': 'fresh-linkedin-profile-data.p.rapidapi.com',
                },
                signal: AbortSignal.timeout(25000),
              }
            );
            if (postsRes.ok) {
              const raw = await postsRes.json();
              allPosts = raw?.data || raw?.posts || (Array.isArray(raw) ? raw : []);
              send(`✓ Fetched ${allPosts.length} posts total.`);
            } else {
              send(`⚠ Posts fetch returned ${postsRes.status} — analysis will be profile-only.`);
            }
          } catch (e: any) {
            send(`⚠ Could not fetch posts (${e.message}) — analysis will be profile-only.`);
          }

          // Filter to target month
          const [year, month] = targetMonth.split('-').map(Number);
          const monthPosts = allPosts.filter((p: any) => {
            const raw = p.postedAt || p.publishedAt || p.date || '';
            if (!raw) return true; // keep if no date
            try {
              const d = new Date(raw);
              return d.getFullYear() === year && d.getMonth() + 1 === month;
            } catch {
              return true;
            }
          });

          const postsForAnalysis = monthPosts.length > 0 ? monthPosts : allPosts.slice(0, 15);
          send(`  ${postsForAnalysis.length} posts selected for analysis (${targetMonth}).`);

          const postsContext = postsForAnalysis.length > 0
            ? postsForAnalysis.map((p: any, i: number) => {
                const text = (p.text || p.content || p.commentary || '').slice(0, 400);
                const likes = p.totalReactionCount || p.likes || p.likeCount || 0;
                const comments = p.commentsCount || p.comments || 0;
                const impressions = p.impressionCount || p.impressions || 'N/A';
                const date = p.postedAt || p.publishedAt || p.date || 'N/A';
                return `Post ${i + 1} [${date}]:\n  "${text}"\n  Reactions: ${likes} | Comments: ${comments} | Impressions: ${impressions}`;
              }).join('\n\n')
            : 'No post data available — analysis based on profile only.';

          const profileContext = profileData
            ? `Name: ${profileData.fullName || username}
Headline: ${profileData.headline || 'N/A'}
Followers/Connections: ${profileData.followers || profileData.connections || 'N/A'}
Location: ${profileData.location || 'N/A'}`
            : `LinkedIn username: ${username}`;

          // === Check for pause/stop before Step 3 ===
          await waitWhilePaused(runId, send);

          // ── Step 3: Claude analysis ───────────────────────────────────────
          send('');
          send('Step 3/4 — Analyzing performance with Claude...');

          const directiveCtx = buildDirectiveContext(runId);
          const analysisResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2000,
            messages: [
              {
                role: 'user',
                content: `You are a LinkedIn performance analyst reviewing Daud Yusuf's own content metrics for ${targetMonth}.

PROFILE:
${profileContext}

POSTS FOR ${targetMonth}:
${postsContext}
${directiveCtx}
Produce a monthly performance snapshot covering:

1. ENGAGEMENT OVERVIEW
   - Total posts published
   - Total reactions, comments (sum across all posts)
   - Average reactions per post, average comments per post
   - Best-performing post (highest reactions): quote the first 100 chars + its stats

2. CONTENT PILLAR BREAKDOWN
   - Categorize each post into one of: Personal Story | Industry Insight | Tactical Tips | Controversial Take | Social Proof | Other
   - Show count and % for each pillar used

3. PERFORMANCE GRADE
   - Grade this month A/B/C/D/F based on: posting consistency, engagement rates, content variety
   - Overall score out of 100
   - One-sentence reasoning for the grade

4. TOP 3 RECOMMENDATIONS FOR NEXT MONTH
   - Specific, actionable improvements based on what the data shows

FORMAT EXACTLY AS:
ENGAGEMENT OVERVIEW
Posts: X | Total Reactions: X | Total Comments: X
Avg Reactions/Post: X | Avg Comments/Post: X
Best Post: "[first 100 chars]" — Reactions: X, Comments: X

CONTENT PILLAR BREAKDOWN
[pillar]: X posts (X%)
...

PERFORMANCE GRADE: XX/100 — Grade [X]
[one-sentence reasoning]

RECOMMENDATIONS FOR NEXT MONTH
1. [specific action]
2. [specific action]
3. [specific action]`,
              },
            ],
          });

          const analysis = analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text : '';

          send('');
          send(`════════════ PERFORMANCE SNAPSHOT — ${targetMonth} ════════════`);
          for (const line of analysis.split('\n')) send(line);
          send('═══════════════════════════════════════════════════════════════');

          // === Check for pause/stop before Step 4 ===
          await waitWhilePaused(runId, send);

          // ── Step 4: Save to Notion ────────────────────────────────────────
          send('');
          send('Step 4/4 — Saving snapshot to Notion...');

          const scoreMatch = analysis.match(/PERFORMANCE GRADE:\s*(\d+)\/100/);
          const gradeMatch = analysis.match(/Grade\s+([A-F])/);
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
          const grade = gradeMatch ? gradeMatch[1] : 'C';

          const recSection = analysis.split('RECOMMENDATIONS FOR NEXT MONTH')[1] || '';

          try {
            await savePerformanceSnapshot({
              month: targetMonth,
              grade,
              score,
              analysis: analysis.split('RECOMMENDATIONS FOR NEXT MONTH')[0].trim(),
              recommendations: recSection.trim(),
            });
            send(`✅ Snapshot saved to Notion — ${targetMonth} | Score: ${score}/100 | Grade: ${grade}`);
          } catch (notionErr: any) {
            send(`✅ Analysis complete — Notion save failed: ${notionErr.message}`);
            console.error('[performance] Notion save failed:', notionErr.message);
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
