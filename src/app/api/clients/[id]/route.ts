import { NextResponse } from 'next/server';
import { prisma, mapAudiogram, mapInvoice, logAudit } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [rawAudiograms, earmoldOrders, rawInvoices, devices] = await Promise.all([
      prisma.audiogram.findMany({
        where: { clientId: client.id },
        orderBy: { date: 'desc' },
      }),
      prisma.earmoldOrder.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { clientId: client.id },
        orderBy: { date: 'desc' },
      }),
      prisma.serialUnit.findMany({
        where: { clientId: client.id },
      }),
    ]);

    return NextResponse.json({
      client,
      audiograms: rawAudiograms.map(mapAudiogram),
      earmoldOrders,
      invoices: rawInvoices.map(mapInvoice),
      devices,
    });
  } catch (error) {
    console.error('Error fetching client details:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Exclude relations / id from update payload
    const {
      id: _id,
      audiograms: _audiograms,
      earmoldOrders: _earmoldOrders,
      invoices: _invoices,
      devices: _devices,
      ...updateData
    } = body;

    if (updateData.age !== undefined) {
      updateData.age = Number(updateData.age);
    }

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
