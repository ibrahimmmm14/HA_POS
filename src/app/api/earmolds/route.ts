import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { EarmoldOrder, MessageLog } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const clientId = searchParams.get('clientId');

  const db = readDb();
  let orders = db.earmoldOrders;

  if (status && status !== 'all') {
    orders = orders.filter((o) => o.status === status);
  }
  if (clientId) {
    orders = orders.filter((o) => o.clientId === clientId);
  }

  // Include client names
  const ordersWithClients = orders.map((o) => {
    const client = db.clients.find((c) => c.id === o.clientId);
    return {
      ...o,
      clientNameAr: client?.nameAr || 'غير محدد',
      clientNameEn: client?.nameEn || 'Unknown',
      clientPhone: client?.phone || '',
    };
  });

  return NextResponse.json({ orders: ordersWithClients });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();

    const orderNo = `EMO-${new Date().getFullYear()}-${String(db.earmoldOrders.length + 43).padStart(4, '0')}`;

    const newOrder: EarmoldOrder = {
      ...body,
      id: `emo-${Date.now()}`,
      orderNo,
      createdAt: new Date().toISOString(),
      status: body.status || 'pending',
    };

    db.earmoldOrders.unshift(newOrder);
    writeDb(db);

    const client = db.clients.find((c) => c.id === newOrder.clientId);
    logAudit(
      'CREATE_EARMOLD_ORDER',
      'EARMOLD_ORDER',
      newOrder.id,
      `إنشاء طلب تصنيع قالب معمل رقم ${newOrder.orderNo} للمريض ${client?.nameAr || ''}`
    );

    return NextResponse.json({ order: newOrder });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create earmold order' }, { status: 500 });
  }
}
