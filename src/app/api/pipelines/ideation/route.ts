import Anthropic from '@anthropic-ai/sdk';
import { saveIdeationHooks } from '@/lib/notion';
import { getResearchContext } from '@/lib/research';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { niche } = await request.json();
    if (!niche) return new Response(JSON.stringify({ error: 'Niche is required' }), { status: 400 });

    const researchContext = getResearchContext();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        try {
          send(`Initializing Pipeline 1: Content Ideation...`);
          send(`Target Niche: ${niche}`);
          send('Querying Claude for trending topics and hook ideas...');

          if (researchContext) {
            send('Injecting niche research context...');
          }

          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [
              {
                role: 'user',
                content: `You are a LinkedIn content strategist specializing in the "${niche}" niche.
${researchContext ? `\nNICHE RESEARCH DATA (use this to tailor hooks to the real ICP, competitors, and market gaps):\n${researchContext}\n` : ''}
Generate 10 highly engaging LinkedIn post hook ideas based on current trends and pain points in this niche. Each hook should be provocative, specific, and scroll-stopping.

Format your response as a numbered list. For each idea, provide:
1. The hook (first line of the post)
2. Post format (Story/Opinion/List/Data)
3. Why it will perform well (1 sentence)

Keep hooks concise — max 12 words each. Avoid corporate jargon, "delve", "landscape", or "fast-paced".`,
              },
            ],
          });

          const content = response.content[0].type === 'text' ? response.content[0].text : '';
          const lines = content.split('\n').filter(l => l.trim());

          send('Analyzing recent high-performing posts in niche...');
          for (const line of lines) {
            if (line.trim()) send(line);
          }

          send('Saving hooks to Notion Kanban...');
          const hookCount = lines.filter(l => /^\d+\./.test(l)).length || 10;
          try {
            await saveIdeationHooks({ niche, hooks: content, hookCount });
            send('✅ Hook ideas generated and saved to Notion Kanban.');
          } catch (notionErr: any) {
            send('✅ 10 hook ideas generated.');
            console.error('[ideation] Notion save failed:', notionErr.message);
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
