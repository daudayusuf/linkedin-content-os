import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return new Response('LINKEDIN_CLIENT_ID is not set in .env', { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/linkedin/callback`;

  // r_member_postAnalytics and r_member_profileAnalytics require MDP approval — add them back once approved
  const scopes = ['openid', 'profile', 'email'].join('%20');

  // Cryptographically random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  // Store state in httpOnly cookie so callback can verify it
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  return response;
}
