import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { currentUser, guarded, scopeFilter } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(request: Request) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { branchId: scopeFilter(currentUser(request)) },
      take: 50,
      orderBy: { timestamp: 'desc' },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
