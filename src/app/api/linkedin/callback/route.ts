import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const returnedState = searchParams.get('state');

  if (error || !code) {
    const desc = searchParams.get('error_description') || error || 'Unknown error';
    return new Response(`LinkedIn OAuth error: ${desc}`, { status: 400 });
  }

  // Validate CSRF state
  const storedState = request.cookies.get('linkedin_oauth_state')?.value;
  if (!storedState || !returnedState || storedState !== returnedState) {
    return new Response('OAuth state mismatch — possible CSRF attack. Please try again.', { status: 403 });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET not set', { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/linkedin/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    return new Response(`Token exchange failed: ${body}`, { status: 500 });
  }

  const tokens = await tokenRes.json();
  const accessToken: string = tokens.access_token;
  const refreshToken: string = tokens.refresh_token || '';
  const expiresIn: number = tokens.expires_in || 5184000; // 60 days default

  // Fetch user info (name, photo, person URN via sub claim)
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let personUrn = '';
  let name = '';
  let picture = '';
  if (userRes.ok) {
    const user = await userRes.json();
    personUrn = user.sub || '';
    name = user.name || '';
    picture = user.picture || '';
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Write to .env.local so the user can commit it to .env
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envLines = [
    `LINKEDIN_ACCESS_TOKEN=${accessToken}`,
    `LINKEDIN_REFRESH_TOKEN=${refreshToken}`,
    `LINKEDIN_TOKEN_EXPIRES_AT=${expiresAt}`,
    `LINKEDIN_PERSON_URN=${personUrn}`,
  ];

  try {
    // Merge with existing .env.local
    let existing = '';
    if (fs.existsSync(envLocalPath)) {
      existing = fs.readFileSync(envLocalPath, 'utf-8');
    }
    const existingLines = existing.split('\n').filter(Boolean);
    const keysToReplace = new Set(envLines.map((l) => l.split('=')[0]));
    const kept = existingLines.filter((l) => !keysToReplace.has(l.split('=')[0]));
    fs.writeFileSync(envLocalPath, [...kept, ...envLines].join('\n') + '\n', 'utf-8');
  } catch {
    // Non-fatal: log to console if file write fails
    console.error('[linkedin/callback] Could not write .env.local');
  }

  const html = `<!DOCTYPE html><html><head><title>LinkedIn Connected</title></head><body style="font-family:sans-serif;padding:2rem;background:#0f172a;color:#f8fafc">
<h1 style="color:#34d399">✅ LinkedIn Connected!</h1>
<p>Authenticated as: <strong>${name}</strong></p>
<p>Person URN: <code style="background:#1e293b;padding:2px 6px;border-radius:4px">${personUrn}</code></p>
<p>Token expires: <code style="background:#1e293b;padding:2px 6px;border-radius:4px">${expiresAt}</code></p>
<p style="color:#94a3b8">Your tokens have been saved to <code>.env.local</code>. Restart the dev server, then reload your dashboard to see live metrics.</p>
<a href="/" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none">← Back to Dashboard</a>
</body></html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
  // Clear the one-time CSRF state cookie
  response.cookies.set('linkedin_oauth_state', '', { maxAge: 0, path: '/' });
  return response;
}
