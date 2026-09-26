import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { Client } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const db = readDb();
  let clients = db.clients;

  if (search) {
    clients = clients.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(search) ||
        c.nameEn.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.nationalId.includes(search) ||
        c.fileNo.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();

    const newClient: Client = {
      ...body,
      id: `cl-${Date.now()}`,
      fileNo: body.fileNo || `F-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    db.clients.unshift(newClient);
    writeDb(db);

    logAudit(
      'CREATE_CLIENT',
      'CLIENT',
      newClient.id,
      `تم تسجيل ملف مريض جديد: ${newClient.nameAr} (${newClient.fileNo})`
    );

    return NextResponse.json({ client: newClient });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
