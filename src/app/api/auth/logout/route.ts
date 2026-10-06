import { NextResponse } from 'next/server';
import { getSessionUser, logLoginEvent } from '@/lib/auth';
import { clearedSessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getSessionUser(request).catch(() => null);
  if (user) {
    await logLoginEvent(request, { userId: user.id, username: user.username, event: 'logout', success: true });
  }
  const response = NextResponse.json({ ok: true });
  response.headers.append('Set-Cookie', clearedSessionCookie());
  return response;
}
