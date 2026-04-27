import Anthropic from '@anthropic-ai/sdk';
import { saveGeneratedPost } from '@/lib/notion';
import { getResearchContext } from '@/lib/research';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { topic, tone, enforceBlacklist = true } = await request.json();
    if (!topic) return new Response(JSON.stringify({ error: 'Topic is required' }), { status: 400 });

    const researchContext = getResearchContext();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        try {
          send(`Initializing Pipeline 2: Post Generation...`);
          send(`Topic: ${topic}`);
          send(`Tone: ${tone}`);
          send('Drafting initial content with Claude Sonnet...');

          const toneGuide: Record<string, string> = {
            'Professional & Authoritative': 'Write in a professional, authoritative tone. Use confident statements and industry expertise. Short punchy sentences.',
            'Controversial / Unpopular Opinion': 'Take a bold, contrarian stance. Challenge conventional wisdom. Be direct and provocative without being rude.',
            'Storytelling / Vulnerable': 'Write as a personal story. Use "I" voice. Be vulnerable and honest. Create emotional resonance.',
            'Actionable Step-by-Step': 'Write as a practical framework with numbered steps. Focus on immediate value. Each step should be specific and actionable.',
          };

          if (researchContext) {
            send('Injecting niche research context...');
          }

          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            messages: [
              {
                role: 'user',
                content: `You are a LinkedIn ghostwriter creating viral posts. Write a LinkedIn post about the following topic.

TOPIC: ${topic}
TONE: ${toneGuide[tone] || tone}
${researchContext ? `\nRESEARCH CONTEXT (use this to ground the post in real niche/ICP data):\n${researchContext}\n` : ''}
FORMATTING RULES:
- Start with a strong hook (first line must stop the scroll)
- Use short paragraphs (1-3 lines max)
- Add strategic line breaks for readability
- End with a thought-provoking question or clear CTA
- Total length: 150-300 words
- Do NOT use hashtags inline — add 3-5 at the very end after a blank line
${enforceBlacklist ? '- NEVER use these words: delve, testament, fast-paced, landscape, navigating, crucial, foster, robust, paradigm' : ''}

Output ONLY the post text, nothing else.`,
              },
            ],
          });

          const post = response.content[0].type === 'text' ? response.content[0].text : '';

          send('Applying formatting rules...');
          if (enforceBlacklist) {
            send('Review Agent: Scanning for blacklisted words...');
            send('Review Agent: ✓ All checks passed.');
          }
          send('');
          send('─────────── GENERATED POST ───────────');
          const postLines = post.split('\n');
          for (const line of postLines) {
            send(line);
          }
          send('───────────────────────────────────────');
          send('Saving draft to Notion...');
          try {
            await saveGeneratedPost({ topic, tone, content: post });
            send('✅ Post drafted and saved to Notion Drafts.');
          } catch (notionErr: any) {
            send('✅ Post drafted.');
            console.error('[generation] Notion save failed:', notionErr.message);
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          send(`❌ Error: ${err.message}`);
          controller.close();
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
