import { NextRequest, NextResponse } from 'next/server';

type LimitConfig = {
  windowMs: number;
  max: number;
};

type CounterEntry = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, CounterEntry>();

const DEFAULT_LIMIT: LimitConfig = {
  windowMs: 60_000,
  max: 30,
};

const LIMITS: Array<{ prefix: string; config: LimitConfig }> = [
  { prefix: '/api/pipelines/audit', config: { windowMs: 60_000, max: 6 } },
  { prefix: '/api/pipelines/generation', config: { windowMs: 60_000, max: 10 } },
  { prefix: '/api/pipelines/ideation', config: { windowMs: 60_000, max: 10 } },
  { prefix: '/api/pipelines/engagement', config: { windowMs: 60_000, max: 8 } },
  { prefix: '/api/pipelines/repurposing', config: { windowMs: 60_000, max: 8 } },
  { prefix: '/api/notion/records', config: { windowMs: 60_000, max: 60 } },
];

function resolveLimit(pathname: string): LimitConfig {
  const match = LIMITS.find((item) => pathname.startsWith(item.prefix));
  return match?.config ?? DEFAULT_LIMIT;
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

function maybeCleanup(now: number): void {
  if (counters.size < 2000) return;

  for (const [key, value] of counters.entries()) {
    if (value.resetAt <= now) {
      counters.delete(key);
    }
  }
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const now = Date.now();
  maybeCleanup(now);

  const limit = resolveLimit(pathname);
  const windowStart = Math.floor(now / limit.windowMs) * limit.windowMs;
  const resetAt = windowStart + limit.windowMs;

  const method = req.method.toUpperCase();
  const ip = getClientIp(req);
  const key = `${pathname}:${method}:${ip}:${windowStart}`;

  const existing = counters.get(key);
  const nextCount = (existing?.count ?? 0) + 1;

  counters.set(key, {
    count: nextCount,
    resetAt,
  });

  const remaining = Math.max(0, limit.max - nextCount);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  if (nextCount > limit.max) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again shortly.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(limit.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limit.max));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
