import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, hashPassword, logLoginEvent, passwordProblem, verifyPassword } from '@/lib/auth';
import { sessionCookie, signSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// A signed-in user changes their own password (also used for the forced change after an admin reset).
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const next = body.newPassword;

    const problem = passwordProblem(next);
    if (problem) return NextResponse.json({ error: 'weak_password', message: problem }, { status: 400 });
    if (next === current) return NextResponse.json({ error: 'same_password' }, { status: 400 });

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    if (!row || !(await verifyPassword(current, row.passwordHash))) {
      await logLoginEvent(request, { userId: user.id, username: user.username, event: 'password_change_failed', success: false, detail: 'wrong current password' });
      return NextResponse.json({ error: 'wrong_password' }, { status: 403 });
    }

    const newHash = await hashPassword(next);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });
    await logLoginEvent(request, { userId: user.id, username: user.username, event: 'password_changed', success: true });

    // Every other open session of this user ends; this one continues with a fresh cookie.
    const response = NextResponse.json({ ok: true });
    response.headers.append('Set-Cookie', sessionCookie(await signSession(user.id, newHash)));
    return response;
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
