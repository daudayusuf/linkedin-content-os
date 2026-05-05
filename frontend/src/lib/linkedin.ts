export interface LinkedInMetrics {
  followers: number | null;
  totalEngagements: number | null;
  engagementRate: string | null;
  totalImpressions: number | null;
  weeklyChart: { day: string; value: number }[];
  dataSource: 'linkedin' | 'scraper' | 'error';
  error?: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: { data: LinkedInMetrics; ts: number } | null = null;

export async function getLinkedInMetrics(): Promise<LinkedInMetrics> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const hasOfficialToken =
    !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN);

  const data = hasOfficialToken
    ? await fetchViaOfficialAPI()
    : await fetchViaScraper();

  cache = { data, ts: Date.now() };
  return data;
}

// ─── Official LinkedIn API (active once MDP is approved + token is set) ────────

async function fetchViaOfficialAPI(): Promise<LinkedInMetrics> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN!;
  const personUrn = process.env.LINKEDIN_PERSON_URN!;

  try {
    const [followers, analytics] = await Promise.allSettled([
      fetchOfficialFollowers(token),
      fetchOfficialPostAnalytics(token, personUrn),
    ]);

    const followerCount =
      followers.status === 'fulfilled' ? followers.value : null;
    const analyticsData =
      analytics.status === 'fulfilled'
        ? analytics.value
        : { totalImpressions: null, totalEngagements: null, weeklyChart: [] };

    const engagementRate =
      followerCount && analyticsData.totalEngagements
        ? ((analyticsData.totalEngagements / followerCount) * 100).toFixed(1) + '%'
        : null;

    return {
      followers: followerCount,
      totalEngagements: analyticsData.totalEngagements,
      engagementRate,
      totalImpressions: analyticsData.totalImpressions,
      weeklyChart:
        analyticsData.weeklyChart.length > 0
          ? analyticsData.weeklyChart
          : buildEmptyWeeklyChart(),
      dataSource: 'linkedin',
    };
  } catch (err: any) {
    console.error('[linkedin] Official API error:', err.message);
    return fetchViaScraper();
  }
}

async function fetchOfficialFollowers(token: string): Promise<number | null> {
  const res = await fetch(
    'https://api.linkedin.com/rest/memberFollowersCount?q=me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': '202501',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.followerCount ?? data?.followersCount ?? null;
}

async function fetchOfficialPostAnalytics(
  token: string,
  personUrn: string
): Promise<{
  totalImpressions: number | null;
  totalEngagements: number | null;
  weeklyChart: { day: string; value: number }[];
}> {
  // Last 30 days
  const endMs = Date.now();
  const startMs = endMs - 30 * 24 * 60 * 60 * 1000;

  const params = new URLSearchParams({
    q: 'analytics',
    analyticsId: personUrn,
    'timeIntervals.timeGranularityType': 'DAY',
    'timeIntervals.timeRange.start': String(startMs),
    'timeIntervals.timeRange.end': String(endMs),
    fields: 'IMPRESSION,REACTION,COMMENT,FOLLOWER_GAINED_FROM_CONTENT',
  });

  const res = await fetch(
    `https://api.linkedin.com/rest/memberCreatorPostAnalytics?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': '202501',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    return { totalImpressions: null, totalEngagements: null, weeklyChart: [] };
  }

  const raw = await res.json();
  const elements: any[] = raw?.elements ?? raw?.data ?? [];

  let totalImpressions = 0;
  let totalEngagements = 0;
  const dailyEngagement: Record<string, number> = {};

  for (const el of elements) {
    const impressions = el.IMPRESSION ?? 0;
    const reactions = el.REACTION ?? 0;
    const comments = el.COMMENT ?? 0;
    const engagements = reactions + comments;

    totalImpressions += impressions;
    totalEngagements += engagements;

    // Build daily map for chart (el.timeRange.start is epoch ms)
    const dayKey = new Date(el.timeRange?.start ?? 0)
      .toLocaleDateString('en-US', { weekday: 'short' });
    dailyEngagement[dayKey] = (dailyEngagement[dayKey] ?? 0) + engagements;
  }

  const weeklyChart = buildWeeklyChart(dailyEngagement);

  return {
    totalImpressions: totalImpressions > 0 ? totalImpressions : null,
    totalEngagements: totalEngagements > 0 ? totalEngagements : null,
    weeklyChart,
  };
}

// ─── Scraper fallback (ScrapingDog + RapidAPI) ─────────────────────────────────

async function fetchViaScraper(): Promise<LinkedInMetrics> {
  const username = process.env.MY_LINKEDIN_USERNAME || '';
  const scrapingdogKey = process.env.SCRAPINGDOG_API_KEY || '';
  const rapidapiKey = process.env.RAPIDAPI_KEY || '';

  if (!username) {
    return errorMetrics('MY_LINKEDIN_USERNAME is not set in .env');
  }

  const [profileResult, postsResult] = await Promise.allSettled([
    scrapingdogKey ? fetchScraperProfile(username, scrapingdogKey) : Promise.resolve(null),
    rapidapiKey ? fetchScraperPosts(username, rapidapiKey) : Promise.resolve([]),
  ]);

  const profile =
    profileResult.status === 'fulfilled' ? profileResult.value : null;
  const posts =
    postsResult.status === 'fulfilled' ? postsResult.value : [];

  // ScrapingDog returns followers as "396 followers" string — parse it
  const parseFollowerString = (v: any): number | null => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? null : n;
    }
    return null;
  };
  const followers: number | null =
    parseFollowerString(profile?.followers) ?? parseFollowerString(profile?.connections) ?? null;

  let totalEngagements = 0;
  let totalImpressions = 0;
  let hasImpressions = false;
  const dailyEngagement: Record<string, number> = {};

  for (const p of posts) {
    // RapidAPI (fresh-linkedin-profile-data) uses num_likes / num_comments / num_reactions
    const likes = p.num_reactions ?? p.num_likes ?? p.totalReactionCount ?? p.likeCount ?? p.likes ?? 0;
    const comments = p.num_comments ?? p.commentsCount ?? p.commentCount ?? p.comments ?? 0;
    const impressions = p.impressionCount ?? p.impressions ?? null;

    totalEngagements += likes + comments;

    if (impressions != null) {
      totalImpressions += impressions;
      hasImpressions = true;
    }

    // RapidAPI uses "posted" field; others use postedAt / publishedAt / date
    const rawDate = p.posted ?? p.postedAt ?? p.publishedAt ?? p.date ?? '';
    if (rawDate) {
      try {
        const dayKey = new Date(rawDate).toLocaleDateString('en-US', { weekday: 'short' });
        dailyEngagement[dayKey] = (dailyEngagement[dayKey] ?? 0) + (likes + comments);
      } catch {}
    }
  }

  const engagementRate =
    followers && followers > 0 && totalEngagements > 0
      ? ((totalEngagements / followers) * 100).toFixed(1) + '%'
      : null;

  return {
    followers,
    totalEngagements: totalEngagements > 0 ? totalEngagements : null,
    engagementRate,
    totalImpressions: hasImpressions && totalImpressions > 0 ? totalImpressions : null,
    weeklyChart: buildWeeklyChart(dailyEngagement),
    dataSource: 'scraper',
  };
}

async function fetchScraperProfile(username: string, apiKey: string): Promise<any> {
  const res = await fetch(
    `https://api.scrapingdog.com/linkedin?api_key=${apiKey}&type=profile&linkId=${username}&premium=true`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) return null;
  const raw = await res.json();
  return Array.isArray(raw) ? raw[0] : raw;
}

async function fetchScraperPosts(username: string, rapidapiKey: string): Promise<any[]> {
  const res = await fetch(
    `https://fresh-linkedin-profile-data.p.rapidapi.com/get-profile-posts?linkedin_url=https://www.linkedin.com/in/${username}&type=posts`,
    {
      headers: {
        'x-rapidapi-key': rapidapiKey,
        'x-rapidapi-host': 'fresh-linkedin-profile-data.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(25000),
    }
  );
  if (!res.ok) return [];
  const raw = await res.json();
  return raw?.data ?? raw?.posts ?? (Array.isArray(raw) ? raw : []);
}

// ─── Chart helpers ─────────────────────────────────────────────────────────────

const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildWeeklyChart(
  dailyMap: Record<string, number>
): { day: string; value: number }[] {
  if (Object.keys(dailyMap).length === 0) return buildEmptyWeeklyChart();
  return DAYS_ORDER.map((day) => ({ day, value: dailyMap[day] ?? 0 }));
}

function buildEmptyWeeklyChart(): { day: string; value: number }[] {
  return DAYS_ORDER.map((day) => ({ day, value: 0 }));
}

function errorMetrics(error: string): LinkedInMetrics {
  return {
    followers: null,
    totalEngagements: null,
    engagementRate: null,
    totalImpressions: null,
    weeklyChart: buildEmptyWeeklyChart(),
    dataSource: 'error',
    error,
  };
}
