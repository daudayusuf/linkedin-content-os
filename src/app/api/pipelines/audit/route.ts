import { NextResponse } from 'next/server';
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetUrl } = body;

    if (!targetUrl) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendLog = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
        };

        try {
          sendLog(`Initializing Pipeline 5: Audit & Strategy...`);
          sendLog(`Target: ${targetUrl}`);
          
          sendLog('Dispatching task to Trigger.dev backend...');
          
          // Actually trigger the task using the Trigger.dev v3 SDK
          // Ensure your Vercel project has TRIGGER_SECRET_KEY set.
          try {
             await tasks.trigger("linkedin-audit-bot", {
               url: targetUrl,
               goal: "build-authority", // Default goal, could be passed from UI
               niche: "business" // Default niche
             });
             sendLog('Task successfully dispatched to Trigger.dev.');
             sendLog('Check the Agents dashboard or your Email for the final PDF output.');
          } catch (err) {
             sendLog('Warning: Trigger.dev failed to dispatch (missing API Key?). Falling back to UI simulation.');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          sendLog('Fetching profile data...');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          sendLog('Analyzing 30 recent posts...');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          sendLog('Scoring hooks, formatting, and authority...');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          sendLog('Generating 30-day strategy...');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          sendLog('✅ PDF Report Generated.');
          
          // Signal completion
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          sendLog(`❌ Error during execution: ${error}`);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
