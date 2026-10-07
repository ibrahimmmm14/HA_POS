import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { currentUser, guarded, inScope, scopeFilter } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(request: Request) {
  try {
    const [templates, logs] = await Promise.all([
      prisma.messageTemplate.findMany(),
      prisma.messageLog.findMany({
        where: { client: { branchId: scopeFilter(currentUser(request)) } },
        orderBy: { sentAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      templates,
      logs,
    });
  } catch (error) {
    console.error('Error fetching messaging data:', error);
    return NextResponse.json({ error: 'Failed to fetch messaging data' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();

    const recipient = await prisma.client.findUnique({ where: { id: body.clientId ?? '' }, select: { branchId: true } });
    if (!recipient || !inScope(currentUser(request), recipient.branchId)) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const newLog = await prisma.messageLog.create({
      data: {
        id: body.id || `msg-${Date.now()}`,
        clientId: body.clientId || 'cl-01',
        clientName: body.clientName || 'عميل',
        phone: body.phone || '',
        channel: body.channel || 'whatsapp',
        trigger: body.trigger || 'invoice_receipt',
        content: body.content || '',
        status: body.status || 'sent',
        sentAt: body.sentAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
      },
    });

    await logAudit(
      'SEND_MESSAGE',
      'MESSAGE',
      newLog.id,
      `إرسال رسالة ${newLog.channel === 'whatsapp' ? 'واتساب' : 'SMS'} إلى ${newLog.clientName} (${newLog.phone})`
    );

    return NextResponse.json({ log: newLog });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
