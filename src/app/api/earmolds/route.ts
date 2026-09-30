import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    const orders = await prisma.earmoldOrder.findMany({
      where: {
        ...(status && status !== 'all' ? { status } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: {
        client: {
          select: {
            nameAr: true,
            nameEn: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordersWithClients = orders.map((o) => ({
      ...o,
      clientNameAr: o.client?.nameAr || 'غير محدد',
      clientNameEn: o.client?.nameEn || 'Unknown',
      clientPhone: o.client?.phone || '',
    }));

    return NextResponse.json({ orders: ordersWithClients });
  } catch (error) {
    console.error('Error fetching earmold orders:', error);
    return NextResponse.json({ error: 'Failed to fetch earmold orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const count = await prisma.earmoldOrder.count();
    const orderNo =
      body.orderNo ||
      `EMO-${new Date().getFullYear()}-${String(count + 43).padStart(4, '0')}`;

    const newOrder = await prisma.earmoldOrder.create({
      data: {
        id: body.id || `emo-${Date.now()}`,
        orderNo,
        clientId: body.clientId,
        ear: body.ear || 'both',
        shellType: body.shellType || 'acrylic',
        color: body.color || 'clear',
        ventType: body.ventType || 'none',
        deviceBrand: body.deviceBrand || null,
        deviceModel: body.deviceModel || null,
        impressionDate: body.impressionDate || new Date().toISOString().split('T')[0],
        impressionBy: body.impressionBy || 'أخصائي المعمل',
        workshop: body.workshop || 'معمل الرياض المركزي',
        expectedDate: body.expectedDate || new Date().toISOString().split('T')[0],
        status: body.status || 'pending',
        price: Number(body.price) || 0,
        cost: Number(body.cost) || 0,
        notes: body.notes || null,
        invoiceId: body.invoiceId || null,
        createdAt: body.createdAt || new Date().toISOString(),
      },
    });

    const client = await prisma.client.findUnique({
      where: { id: newOrder.clientId },
      select: { nameAr: true },
    });

    await logAudit(
      'CREATE_EARMOLD_ORDER',
      'EARMOLD_ORDER',
      newOrder.id,
      `إنشاء طلب تصنيع قالب معمل رقم ${newOrder.orderNo} للمريض ${client?.nameAr || ''}`
    );

    return NextResponse.json({ order: newOrder });
  } catch (error) {
    console.error('Error creating earmold order:', error);
    return NextResponse.json({ error: 'Failed to create earmold order' }, { status: 500 });
  }
}
