import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Dates the user picks are Saudi local days (UTC+3); log timestamps are stored in UTC.
const dayStart = (d: string) => new Date(`${d}T00:00:00+03:00`).toISOString();
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999+03:00`).toISOString();

export const GET = guarded(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const username = searchParams.get('username')?.trim();
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 200, 1), 500);

    const timestamp: Record<string, string> = {};
    if (from && DATE_RE.test(from)) timestamp.gte = dayStart(from);
    if (to && DATE_RE.test(to)) timestamp.lte = dayEnd(to);

    const logs = await prisma.loginLog.findMany({
      where: {
        ...(Object.keys(timestamp).length ? { timestamp } : {}),
        ...(username ? { username: { contains: username, mode: 'insensitive' } } : {}),
        ...(status === 'success' ? { success: true } : status === 'failed' ? { success: false } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching login logs:', error);
    return NextResponse.json({ error: 'Failed to fetch login logs' }, { status: 500 });
  }
});
