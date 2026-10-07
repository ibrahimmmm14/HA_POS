import { NextResponse } from 'next/server';
import { prisma, mapAudiogram, mapInvoice, logAudit } from '@/lib/db';
import { currentUser, guarded, inScope, scopeFilter } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = currentUser(request);
    const client = await prisma.client.findUnique({
      where: { id: params.id },
    });

    // A patient of another branch looks exactly like one that does not exist
    if (!client || !inScope(user, client.branchId)) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [rawAudiograms, earmoldOrders, rawInvoices, devices, repairTickets] = await Promise.all([
      prisma.audiogram.findMany({
        where: { clientId: client.id },
        orderBy: { date: 'desc' },
      }),
      prisma.earmoldOrder.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { clientId: client.id, branchId: scopeFilter(user) },
        orderBy: { date: 'desc' },
      }),
      prisma.serialUnit.findMany({
        where: { clientId: client.id, branchId: scopeFilter(user) },
      }),
      prisma.repairTicket.findMany({
        where: { clientId: client.id, branchId: scopeFilter(user) },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      client,
      audiograms: rawAudiograms.map(mapAudiogram),
      earmoldOrders,
      invoices: rawInvoices.map(mapInvoice),
      devices,
      repairTickets,
    });
  } catch (error) {
    console.error('Error fetching client details:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

async function PUTHandler(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = currentUser(request);
    const body = await request.json();

    const existing = await prisma.client.findUnique({ where: { id: params.id }, select: { branchId: true } });
    if (!existing || !inScope(user, existing.branchId)) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Exclude relations / id from update payload
    const {
      id: _id,
      branch: _branch,
      audiograms: _audiograms,
      earmoldOrders: _earmoldOrders,
      invoices: _invoices,
      devices: _devices,
      repairTickets: _repairTickets,
      ...updateData
    } = body;

    if (updateData.age !== undefined) {
      updateData.age = Number(updateData.age);
    }

    // Moving a patient to another branch is for administrators only
    if (user.role !== 'super_admin') delete updateData.branchId;

    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAudit(
      'UPDATE_CLIENT',
      'CLIENT',
      params.id,
      `تحديث بيانات المريض ${updatedClient.nameAr}`
    );

    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const PUT = guarded(PUTHandler);
