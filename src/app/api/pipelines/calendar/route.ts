import Anthropic from '@anthropic-ai/sdk';
import { getLatestStrategyOutput, publishMonthCalendar, logActivity, type CalendarPostData } from '@/lib/notion';
import { DAUD_VOICE_GUIDE, AI_LANGUAGE_BLACKLIST } from '@/lib/writing-context';
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
    const { month } = await request.json();
    if (!month) {
      return new Response(JSON.stringify({ error: 'Target month is required (YYYY-MM)' }), { status: 400 });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const monthName = new Date(year, monthNum - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Generate a unique run ID for task control
    const runId = `calendar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createRun(runId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        // Send the runId as the very first event so the frontend can control this run
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ runId })}\n\n`));

        try {
          send('Initializing Pipeline 3: Content Calendar, Planning & Writing...');
          send(`Target month: ${monthName}`);
          send('');

          // === Check for pause/stop before Step 1 ===
          await waitWhilePaused(runId, send);

          // Step 1 — Load strategy
          send('Step 1/5 — Loading content strategy from Notion...');
          const strategyContext = await getLatestStrategyOutput();

          if (!strategyContext) {
            send('⚠️  No strategy found in Notion. Generating calendar from first principles.');
            send('   Tip: Run Pipeline 2 (Content Strategy) first for better, grounded content.');
          } else {
            send('✅ Content strategy loaded from Notion');
          }

          const strategySection = strategyContext
            ? strategyContext.slice(0, 2500)
            : 'No prior strategy — generate content that demonstrates thought leadership in B2B and LinkedIn growth.';

          // === Check for pause/stop before Step 2 ===
          await waitWhilePaused(runId, send);

          // Step 2 — Plan calendar skeleton
          send('');
          send('Step 2/5 — Planning calendar skeleton (4-5 posts/week on Tue/Thu/Fri/Sat)...');

          // Build posting dates for the month (Tue=2, Thu=4, Fri=5, Sat=6)
          const postDays: { date: string; day: string }[] = [];
          const daysInMonth = new Date(year, monthNum, 0).getDate();
          for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(year, monthNum - 1, d);
            const dayOfWeek = dt.getDay(); // 0=Sun...6=Sat
            if ([2, 4, 5, 6].includes(dayOfWeek)) {
              postDays.push({
                date: `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                day: dt.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
              });
            }
          }

          const directiveCtx1 = buildDirectiveContext(runId);
          const calendarPlan = await callClaude(
            `You are a LinkedIn content strategist. Plan a ${monthName} content calendar.

Strategy context:
${strategySection}

Available post slots (${postDays.length} slots):
${postDays.map((d) => `${d.date} (${d.day})`).join('\n')}

For each post slot, assign:
- Content Pillar (from: Thought Leadership, Education, Personal Brand, Social Proof, Audience Engagement, Category Authority)
- Post Format (from: Text-only, Carousel, Poll, List post, Story/Narrative, Data insight, Bold opinion)
- Topic (specific, 1 sentence)
${directiveCtx1}
Return as JSON array: [{"date":"YYYY-MM-DD","pillar":"...","format":"...","topic":"..."}]
Return ONLY the JSON array, no other text.`,
            2000
          );

          let postPlans: { date: string; pillar: string; format: string; topic: string }[] = [];
          try {
            const jsonMatch = calendarPlan.match(/\[[\s\S]*\]/);
            if (jsonMatch) postPlans = JSON.parse(jsonMatch[0]);
          } catch {
            // Fallback: create basic plans if JSON parsing fails
            postPlans = postDays.map((d, i) => ({
              date: d.date,
              pillar: ['Thought Leadership', 'Education', 'Personal Brand', 'Social Proof', 'Audience Engagement', 'Category Authority'][i % 6],
              format: ['Text-only', 'Carousel', 'List post', 'Story/Narrative'][i % 4],
              topic: `LinkedIn growth insight #${i + 1}`,
            }));
          }

          send(`✅ Calendar skeleton planned — ${postPlans.length} posts for ${monthName}`);

          // === Check for pause/stop before Step 3 ===
          await waitWhilePaused(runId, send);

          // Step 3 — Write each post
          send('');
          send(`Step 3/5 — Writing ${postPlans.length} full post captions...`);

          const writtenPosts: CalendarPostData[] = [];

          for (let i = 0; i < postPlans.length; i++) {
            // Check for pause/stop before each individual post write
            await waitWhilePaused(runId, send);

            const plan = postPlans[i];
            const dayInfo = postDays.find((d) => d.date === plan.date) ?? postDays[i] ?? { date: plan.date, day: plan.date };

            send(`Writing post ${i + 1}/${postPlans.length}: ${plan.topic.slice(0, 60)}...`);

            const directiveCtx = buildDirectiveContext(runId);
            const postContent = await callClaude(
              `You are writing a LinkedIn post for Daud Yusuf. Study the voice guide and blacklist below carefully — every rule is non-negotiable.

---
${DAUD_VOICE_GUIDE}
---
${AI_LANGUAGE_BLACKLIST}
---

Post details:
- Date: ${dayInfo.day}
- Content Pillar: ${plan.pillar}
- Format: ${plan.format}
- Topic: ${plan.topic}

Strategy context:
${strategySection.slice(0, 800)}
${directiveCtx}
Write the complete LinkedIn post. Before writing, silently check:
- Does this sound like Daud talking TO the reader, or reporting about a topic?
- Does it build up to the point rather than dropping a cold statement?
- Does it contain ANY word or phrase from the blacklist? If yes, rewrite.
- Is there warmth — would the reader feel a person wrote this?

Include:
1. CAPTION (150-300 words in Daud's authentic voice — strong hook first line, invite the reader in, build to the point, warm and direct)
2. DIRECTION NOTES (2-3 specific sentences for designer — what visual, data, or graphic to pair with this post)
3. HASHTAGS (5-8 relevant hashtags, mix of broad and niche, no generic filler tags)

Format your response exactly as:
CAPTION:
[full caption here]

DIRECTION:
[direction notes here]

HASHTAGS:
[hashtags here]`,
              1200
            );

            // Parse the post content
            const captionMatch = postContent.match(/CAPTION:\s*([\s\S]*?)(?=DIRECTION:|$)/i);
            const directionMatch = postContent.match(/DIRECTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
            const hashtagsMatch = postContent.match(/HASHTAGS:\s*([\s\S]*?)$/i);

            writtenPosts.push({
              date: plan.date,
              day: dayInfo.day,
              pillar: plan.pillar,
              format: plan.format,
              topic: plan.topic,
              caption: captionMatch?.[1]?.trim() ?? postContent.slice(0, 500),
              direction: directionMatch?.[1]?.trim() ?? '',
              hashtags: hashtagsMatch?.[1]?.trim() ?? '',
            });
          }

          send(`✅ All ${writtenPosts.length} posts written`);

          // === Check for pause/stop before Step 4 ===
          await waitWhilePaused(runId, send);

          // Step 4 — Quality review
          send('');
          send('Step 4/5 — Running quality review gate...');
          const reviewSample = writtenPosts.slice(0, 5).map((p) => `[${p.date}] ${p.pillar} — ${p.topic}`).join('\n');
          const directiveCtx3 = buildDirectiveContext(runId);
          const qualityReview = await callClaude(
            `Review this LinkedIn content calendar for quality. Check:
1. Voice consistency (confident, direct, no corporate speak)
2. Pillar coverage (all 6 pillars represented)
3. Format diversity (mix of formats, not too repetitive)
4. Caption quality (strong hooks, valuable content)
5. Topic variety (not too repetitive or similar)

Sample posts:
${reviewSample}

Total posts: ${writtenPosts.length}
Pillar distribution: ${[...new Set(writtenPosts.map((p) => p.pillar))].join(', ')}
Format distribution: ${[...new Set(writtenPosts.map((p) => p.format))].join(', ')}
${directiveCtx3}
Give a brief quality verdict (2-3 sentences) and an overall score out of 10.`,
            400
          );
          send(`✅ Quality review: ${qualityReview.slice(0, 200)}`);

          // === Check for pause/stop before Step 5 ===
          await waitWhilePaused(runId, send);

          // Step 5 — Build structured Notion pages
          send('');
          send(`Step 5/5 — Building Notion structure for ${monthName}...`);

          try {
            const { summaryPageId, contentsPageId } = await publishMonthCalendar(
              month,
              monthName,
              writtenPosts,
              strategySection,
              (msg) => send(msg),
            );

            send(`✅ Summary page created (pillar breakdown, format mix, strategy notes)`);
            send(`✅ Posts page created — ${writtenPosts.length} posts with captions, directions, and hashtags`);
            send(`   Summary: https://notion.so/${summaryPageId.replace(/-/g, '')}`);
            send(`   Posts:   https://notion.so/${contentsPageId.replace(/-/g, '')}`);

            try {
              await logActivity({
                title: `Calendar pipeline completed — ${monthName}`,
                description: `${writtenPosts.length} posts written. Summary + Posts pages created in Notion.`,
                pipeline: 'Calendar',
                type: 'success',
              });
            } catch {}

            send('');
            send('─────── CALENDAR COMPLETE ───────────');
            send(`Pipeline 3 finished. ${writtenPosts.length} posts for ${monthName} are live in Notion.`);
            send('Navigate to 📋 Content Creation → Monthly Content → ' + monthName + ' to see the full structure.');
          } catch (err: any) {
            send(`❌ Notion error: ${err?.message ?? String(err)}`);
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
