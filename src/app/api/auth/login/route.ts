import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logLoginEvent, toAuthedUser, verifyPassword } from '@/lib/auth';
import { signSession, sessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
    }

    // Too many recent failures for this username: refuse without checking the password.
    const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
    // A successful sign-in or an administrator's password reset restarts the count.
    const lastReset = await prisma.loginLog.findFirst({
      where: { username: { equals: username, mode: 'insensitive' }, event: { in: ['login', 'password_reset'] } },
      orderBy: { timestamp: 'desc' },
    });
    const windowStart = lastReset && lastReset.timestamp > since ? lastReset.timestamp : since;
    const recentFailures = await prisma.loginLog.count({
      where: {
        event: 'login_failed',
        username: { equals: username, mode: 'insensitive' },
        timestamp: { gt: windowStart },
      },
    });
    if (recentFailures >= MAX_FAILURES) {
      await logLoginEvent(request, { username, event: 'login_blocked', success: false, detail: 'too many failed attempts' });
      return NextResponse.json({ error: 'locked', minutes: LOCK_MINUTES }, { status: 429 });
    }

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    const passwordOk = await verifyPassword(password, user?.passwordHash);

    if (!user || !passwordOk || !user.active) {
      // The client always gets the same answer; the reason is only recorded in the log.
      const reason = !user ? 'unknown user' : !user.passwordHash ? 'no password set' : !passwordOk ? 'wrong password' : 'account disabled';
      await logLoginEvent(request, { userId: user?.id, username, event: 'login_failed', success: false, detail: reason });
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date().toISOString() } });
    await logLoginEvent(request, { userId: user.id, username: user.username, event: 'login', success: true });

    const response = NextResponse.json({ user: toAuthedUser(user) });
    response.headers.append('Set-Cookie', sessionCookie(await signSession(user.id, user.passwordHash)));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
