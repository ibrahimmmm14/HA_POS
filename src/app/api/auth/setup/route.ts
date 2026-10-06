import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { hashPassword, logLoginEvent, passwordProblem, toAuthedUser } from '@/lib/auth';
import { signSession, sessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** First-time setup is only possible while NO account has a password yet. */
async function setupOpen(): Promise<boolean> {
  return (await prisma.user.count({ where: { passwordHash: { not: null } } })) === 0;
}

export async function GET() {
  try {
    return NextResponse.json({
      needsSetup: await setupOpen(),
      needsCode: !!process.env.SETUP_CODE,
    });
  } catch (error) {
    console.error('Setup status error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

// Set the administrator's password and sign in. Disabled for good as soon as any password exists.
export async function POST(request: Request) {
  try {
    if (!(await setupOpen())) {
      return NextResponse.json({ error: 'setup_closed' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));

    const expectedCode = process.env.SETUP_CODE;
    if (expectedCode) {
      const given = Buffer.from(String(body.setupCode ?? ''));
      const want = Buffer.from(expectedCode);
      if (given.length !== want.length || !timingSafeEqual(given, want)) {
        await logLoginEvent(request, { username: 'admin', event: 'setup', success: false, detail: 'wrong setup code' });
        return NextResponse.json({ error: 'invalid_setup_code' }, { status: 403 });
      }
    }

    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: 'weak_password', message: problem }, { status: 400 });

    const admin = await prisma.user.findFirst({
      where: { role: 'super_admin', active: true },
      orderBy: { id: 'asc' },
    });
    if (!admin) return NextResponse.json({ error: 'no_admin_account' }, { status: 409 });

    // Only succeeds for the first request: the row must still have no password.
    const claimed = await prisma.user.updateMany({
      where: { id: admin.id, passwordHash: null },
      data: { passwordHash: await hashPassword(body.password), lastLoginAt: new Date().toISOString() },
    });
    if (claimed.count !== 1) return NextResponse.json({ error: 'setup_closed' }, { status: 409 });

    await logLoginEvent(request, { userId: admin.id, username: admin.username, event: 'setup', success: true, detail: 'administrator password created' });

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    const response = NextResponse.json({ user: toAuthedUser(fresh) });
    response.headers.append('Set-Cookie', sessionCookie(await signSession(fresh.id, fresh.passwordHash)));
    return response;
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
