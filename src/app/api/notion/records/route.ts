import {
  getRecentAudits,
  getRecentPosts,
  getRecentHooks,
  getRecentEngagementPlans,
  getRecentRepurposed,
  getRecentActivity,
  getEngagementCounts,
} from '@/lib/notion';

const FETCH_MAP: Record<string, (limit: number) => Promise<any>> = {
  audit:      (l) => getRecentAudits(l),
  generation: (l) => getRecentPosts(l),
  ideation:   (l) => getRecentHooks(l),
  engagement: (l) => getRecentEngagementPlans(l),
  repurposing:(l) => getRecentRepurposed(l),
  activity:   (l) => getRecentActivity(l),
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type  = searchParams.get('type') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5'), 20);

  if (type === 'engagement-counts') {
    try {
      const counts = await getEngagementCounts();
      return Response.json(counts);
    } catch (err: any) {
      return Response.json({ plans: 0, notes: 0, comments: 0 });
    }
  }

  const fetcher = FETCH_MAP[type];
  if (!fetcher) {
    return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }

  try {
    const records = await fetcher(limit);
    return Response.json(records);
  } catch (err: any) {
    console.error(`[notion/records] ${type} fetch failed:`, err.message);
    return Response.json([]);
  }
}
