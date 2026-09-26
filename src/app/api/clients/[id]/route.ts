import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = readDb();
  const client = db.clients.find((c) => c.id === params.id);

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const audiograms = db.audiograms.filter((a) => a.clientId === client.id);
  const earmoldOrders = db.earmoldOrders.filter((e) => e.clientId === client.id);
  const invoices = db.invoices.filter((i) => i.clientId === client.id);
  const devices = db.serialUnits.filter((s) => s.clientId === client.id);

  return NextResponse.json({
    client,
    audiograms,
    earmoldOrders,
    invoices,
    devices,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = readDb();
    const index = db.clients.findIndex((c) => c.id === params.id);

    if (index === -1) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    db.clients[index] = { ...db.clients[index], ...body };
    writeDb(db);

    logAudit(
      'UPDATE_CLIENT',
      'CLIENT',
      params.id,
      `تحديث بيانات المريض ${db.clients[index].nameAr}`
    );

    return NextResponse.json({ client: db.clients[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
