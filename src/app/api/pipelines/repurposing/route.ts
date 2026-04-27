import Anthropic from '@anthropic-ai/sdk';
import { saveRepurposedContent } from '@/lib/notion';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { sourceUrl, generateTextPost = true, generateCarousel = true } = await request.json();
    if (!sourceUrl) return new Response(JSON.stringify({ error: 'Source URL is required' }), { status: 400 });
    if (!generateTextPost && !generateCarousel) return new Response(JSON.stringify({ error: 'Select at least one output format' }), { status: 400 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: msg })}\n\n`));

        try {
          send(`Initializing Pipeline 4: Content Repurposing...`);
          send(`Source URL: ${sourceUrl}`);
          send('Fetching content from URL...');

          // Fetch page content via ScrapingDog
          let pageText = '';
          try {
            const scrapeRes = await fetch(
              `https://api.scrapingdog.com/scrape?api_key=${process.env.SCRAPINGDOG_API_KEY}&url=${encodeURIComponent(sourceUrl)}&dynamic=false`,
              { signal: AbortSignal.timeout(15000) }
            );
            if (scrapeRes.ok) {
              const html = await scrapeRes.text();
              // Strip HTML tags to get raw text
              pageText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
              send('✓ Content fetched. Extracting key takeaways...');
            } else {
              pageText = `Content from URL: ${sourceUrl}`;
              send('Note: Could not fetch full page content. Using URL context only.');
            }
          } catch {
            pageText = `Content from URL: ${sourceUrl}`;
            send('Note: Could not fetch full page content. Using URL context only.');
          }

          let textPost = '';
          if (generateTextPost) {
            send('Generating LinkedIn text post...');

            const textPostResponse = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 600,
              messages: [
                {
                  role: 'user',
                  content: `You are a LinkedIn ghostwriter. Repurpose the following web content into a viral LinkedIn text post.

SOURCE URL: ${sourceUrl}
CONTENT EXCERPT: ${pageText.slice(0, 3000)}

INSTRUCTIONS:
- Extract the single most valuable insight or lesson
- Write a compelling hook (first line)
- Keep to 150-250 words with short paragraphs
- End with a discussion question
- Add 3-5 hashtags at the end
- Do NOT use: delve, testament, fast-paced, landscape, navigating, crucial

Output ONLY the LinkedIn post text.`,
                },
              ],
            });

            textPost = textPostResponse.content[0].type === 'text' ? textPostResponse.content[0].text : '';

            send('');
            send('─────────── TEXT POST ───────────');
            for (const line of textPost.split('\n')) send(line);
            send('─────────────────────────────────');
          }

          let carousel = '';
          if (generateCarousel) {
            send('');
            send('Generating Carousel slide copy...');

            const carouselResponse = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 700,
              messages: [
                {
                  role: 'user',
                  content: `From the same source content, create a 7-slide LinkedIn carousel outline.

SOURCE URL: ${sourceUrl}
CONTENT: ${pageText.slice(0, 2000)}

FORMAT for each slide:
Slide X: [Headline — max 8 words]
Body: [2-3 supporting bullet points]

Start with a hook slide and end with a CTA slide. Output ONLY the slide structure.`,
                },
              ],
            });

            carousel = carouselResponse.content[0].type === 'text' ? carouselResponse.content[0].text : '';

            send('');
            send('────────── CAROUSEL COPY ──────────');
            for (const line of carousel.split('\n')) send(line);
            send('────────────────────────────────────');
          }

          const formatCount = (generateTextPost ? 1 : 0) + (generateCarousel ? 1 : 0);
          const formatLabel = formatCount === 1
            ? (generateTextPost ? 'text post' : 'carousel')
            : '2 formats';

          send('');
          send('Saving repurposed content to Notion...');
          try {
            await saveRepurposedContent({
              sourceUrl,
              textPost,
              carouselOutline: carousel,
            });
            send(`✅ Content repurposed into ${formatLabel} and saved to Notion.`);
          } catch (notionErr: any) {
            send(`✅ Content successfully repurposed into ${formatLabel}.`);
            console.error('[repurposing] Notion save failed:', notionErr.message);
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
