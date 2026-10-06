import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { canTransition, isRepairStatus, nowStamp, REPAIR_STATUS_LABELS } from '@/lib/repairs';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await prisma.repairTicket.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        events: { orderBy: [{ timestamp: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Repair ticket not found' }, { status: 404 });
    }

    // Earlier repairs of the same physical device, for repeat-fault tracking
    const deviceHistory = ticket.serialNumber
      ? await prisma.repairTicket.findMany({
          where: { serialNumber: ticket.serialNumber, id: { not: ticket.id } },
          select: { id: true, ticketNo: true, receivedAt: true, issue: true, status: true },
          orderBy: { receivedAt: 'desc' },
        })
      : [];

    const { client, ...ticketData } = ticket;
    return NextResponse.json({ ticket: ticketData, client, deviceHistory });
  } catch (error) {
    console.error('Error fetching repair ticket:', error);
    return NextResponse.json({ error: 'Failed to fetch repair ticket' }, { status: 500 });
  }
}

/**
 * Update a ticket. Only the fields below can change; every status change or note
 * is written to the ticket's history (repair_events).
 */
async function PUTHandler(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const prev = await prisma.repairTicket.findUnique({
      where: { id: params.id },
      include: { client: true },
    });
    if (!prev) {
      return NextResponse.json({ error: 'Repair ticket not found' }, { status: 404 });
    }

    const statusChanged = body.status !== undefined && body.status !== prev.status;
    if (statusChanged) {
      if (!isRepairStatus(body.status) || !isRepairStatus(prev.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      if (!canTransition(prev.status, body.status)) {
        return NextResponse.json(
          { error: `Cannot move repair from ${prev.status} to ${body.status}` },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const field of ['diagnosis', 'notes', 'expectedDate', 'repairedBy'] as const) {
      if (body[field] !== undefined) data[field] = body[field] || null;
    }
    if (data.repairedBy === null) delete data.repairedBy;
    if (body.cost !== undefined) data.cost = Number(body.cost) || 0;
    if (body.charge !== undefined) data.charge = prev.underWarranty ? 0 : Number(body.charge) || 0;
    if (statusChanged) {
      data.status = body.status;
      if (body.status === 'delivered') data.completedAt = new Date().toISOString().split('T')[0];
    }

    const note: string | null = body.note?.trim() || null;
    const stamp = nowStamp();

    const [ticket] = await prisma.$transaction([
      prisma.repairTicket.update({ where: { id: params.id }, data }),
      ...(statusChanged || note
        ? [
            prisma.repairEvent.create({
              data: {
                id: `${prev.id}-ev-${Date.now()}`,
                ticketId: prev.id,
                timestamp: stamp,
                fromStatus: statusChanged ? prev.status : null,
                toStatus: statusChanged ? body.status : prev.status,
                note,
                userName: body.userName || 'فني الصيانة',
              },
            }),
          ]
        : []),
    ]);

    // Same pattern as earmold orders: notify the client when the device is ready
    if (statusChanged && body.status === 'ready' && prev.client) {
      await prisma.messageLog.create({
        data: {
          id: `msg-${Date.now()}`,
          clientId: prev.client.id,
          clientName: prev.client.nameAr,
          phone: prev.client.phone,
          channel: 'whatsapp',
          trigger: 'repair_ready',
          content: `مرحباً عزيزنا العميل ${prev.client.nameAr}، نود إبلاغكم بأن جهازكم المستلم للصيانة برقم (${prev.ticketNo}) أصبح جاهزاً للاستلام. نتشرف بزيارتكم.`,
          status: 'sent',
          sentAt: stamp,
        },
      });
    }

    if (statusChanged) {
      await logAudit(
        'UPDATE_REPAIR_STATUS',
        'REPAIR_TICKET',
        prev.id,
        `تحديث حالة الصيانة ${prev.ticketNo} إلى: ${REPAIR_STATUS_LABELS[body.status as keyof typeof REPAIR_STATUS_LABELS].ar}`
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error updating repair ticket:', error);
    return NextResponse.json({ error: 'Failed to update repair ticket' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const PUT = guarded(PUTHandler);
