import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { nowStamp } from '@/lib/repairs';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Next ticket number for this year, based on the highest existing one (safe after deletions). */
async function nextTicketNo(): Promise<string> {
  const prefix = `REP-${new Date().getFullYear()}-`;
  const last = await prisma.repairTicket.findFirst({
    where: { ticketNo: { startsWith: prefix } },
    orderBy: { ticketNo: 'desc' },
    select: { ticketNo: true },
  });
  const lastSeq = last ? parseInt(last.ticketNo.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
}

async function GETHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const serialNumber = searchParams.get('serialNumber');

    const tickets = await prisma.repairTicket.findMany({
      where: {
        ...(status && status !== 'all' ? { status } : {}),
        ...(clientId ? { clientId } : {}),
        ...(serialNumber ? { serialNumber } : {}),
      },
      include: {
        client: { select: { nameAr: true, nameEn: true, phone: true, fileNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ticketsWithClients = tickets.map(({ client, ...t }) => ({
      ...t,
      clientNameAr: client?.nameAr || 'غير محدد',
      clientNameEn: client?.nameEn || 'Unknown',
      clientPhone: client?.phone || '',
      clientFileNo: client?.fileNo || '',
    }));

    return NextResponse.json({ tickets: ticketsWithClients });
  } catch (error) {
    console.error('Error fetching repair tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch repair tickets' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();

    if (!body.clientId || !body.issue?.trim()) {
      return NextResponse.json(
        { error: 'clientId and issue are required' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: { id: true, nameAr: true },
    });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // If a serial number is given, pull device details and warranty from inventory
    const serialNumber: string | null = body.serialNumber?.trim() || null;
    const unit = serialNumber
      ? await prisma.serialUnit.findUnique({
          where: { serialNumber },
          include: { item: { select: { brand: true, model: true } } },
        })
      : null;

    const today = new Date().toISOString().split('T')[0];
    const underWarranty =
      body.underWarranty !== undefined
        ? Boolean(body.underWarranty)
        : Boolean(unit?.warrantyEndDate && unit.warrantyEndDate >= today);

    const stamp = nowStamp();
    const userName = body.userName || 'فني الصيانة';
    const id = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ticketNo = await nextTicketNo();

    const ticket = await prisma.repairTicket.create({
      data: {
        id,
        ticketNo,
        clientId: client.id,
        branchId: body.branchId || unit?.branchId || 'br-01',
        serialNumber,
        deviceBrand: body.deviceBrand || unit?.item.brand || '',
        deviceModel: body.deviceModel || unit?.item.model || '',
        ear: ['left', 'right', 'both'].includes(body.ear) ? body.ear : 'both',
        issue: body.issue.trim(),
        underWarranty,
        repairedBy: body.repairedBy || 'in_house',
        status: 'received',
        receivedAt: body.receivedAt || today,
        expectedDate: body.expectedDate || null,
        completedAt: null,
        cost: Number(body.cost) || 0,
        charge: underWarranty ? 0 : Number(body.charge) || 0,
        diagnosis: null,
        notes: body.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        events: {
          create: {
            id: `${id}-ev-1`,
            timestamp: stamp,
            fromStatus: null,
            toStatus: 'received',
            note: body.issue.trim(),
            userName,
          },
        },
      },
    });

    await logAudit(
      'CREATE_REPAIR_TICKET',
      'REPAIR_TICKET',
      ticket.id,
      `استلام جهاز للصيانة رقم ${ticket.ticketNo} للمريض ${client.nameAr}${serialNumber ? ` (S/N ${serialNumber})` : ''}`
    );

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error creating repair ticket:', error);
    return NextResponse.json({ error: 'Failed to create repair ticket' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
