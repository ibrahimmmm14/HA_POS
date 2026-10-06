import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { clearedSessionCookie, signSession, sessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

// The signed-in user and their current permissions; also extends the session while they are active.
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) {
    const response = NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    response.headers.append('Set-Cookie', clearedSessionCookie());
    return response;
  }
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  const response = NextResponse.json({ user });
  response.headers.append('Set-Cookie', sessionCookie(await signSession(user.id, row?.passwordHash)));
  return response;
}
