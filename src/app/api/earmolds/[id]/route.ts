import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { Invoice, MessageLog } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = readDb();
  const order = db.earmoldOrders.find((o) => o.id === params.id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const client = db.clients.find((c) => c.id === order.clientId);
  return NextResponse.json({ order, client });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = readDb();
    const index = db.earmoldOrders.findIndex((o) => o.id === params.id);

    if (index === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const prevOrder = db.earmoldOrders[index];
    const updatedOrder = { ...prevOrder, ...body };
    db.earmoldOrders[index] = updatedOrder;

    const client = db.clients.find((c) => c.id === updatedOrder.clientId);

    // If status changed to 'ready', auto-generate ready notification in messageLogs
    if (prevOrder.status !== 'ready' && updatedOrder.status === 'ready' && client) {
      const msg: MessageLog = {
        id: `msg-${Date.now()}`,
        clientId: client.id,
        clientName: client.nameAr,
        phone: client.phone,
        channel: 'whatsapp',
        trigger: 'order_ready',
        content: `مرحباً عزيزنا العميل ${client.nameAr}، نود إبلاغكم بأن طلبكم رقم (${updatedOrder.orderNo}) الخاص بالقالب/السماعة الطبية أصبح جاهزاً للاستلام والتجربة. نتشرف بزيارتكم.`,
        status: 'sent',
        sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      db.messageLogs.unshift(msg);
    }

    writeDb(db);
    logAudit(
      'UPDATE_EARMOLD_STATUS',
      'EARMOLD_ORDER',
      params.id,
      `تحديث حالة طلب المعمل ${updatedOrder.orderNo} إلى: ${updatedOrder.status}`
    );

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// Convert order to invoice action
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = readDb();
    const order = db.earmoldOrders.find((o) => o.id === params.id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const client = db.clients.find((c) => c.id === order.clientId);
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(db.invoices.length + 91).padStart(4, '0')}`;

    const grossAmount = order.price;
    const taxAmount = Number((grossAmount * 0.15).toFixed(2));
    const grandTotal = Number((grossAmount + taxAmount).toFixed(2));

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo,
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      branchId: 'br-01',
      warehouseId: 'wh-01',
      costCenter: 'CC-WORKSHOP-01',
      workshop: order.workshop,
      clientId: order.clientId,
      doctorId: client?.doctorId,
      hospitalId: client?.hospitalId,
      sellerName: 'أخصائي المعمل / سامي',
      lines: [
        {
          id: `ln-${Date.now()}`,
          itemId: 'item-em-01',
          itemCode: 'EM-CUSTOM',
          itemNameAr: `قالب أذن مخصص (${order.shellType} - ${order.ear === 'both' ? 'للأذنين' : order.ear === 'left' ? 'يسار' : 'يمين'}) - طلب ${order.orderNo}`,
          itemNameEn: `Custom Earmold (${order.shellType}) - Order ${order.orderNo}`,
          unit: 'قالب',
          quantity: order.ear === 'both' ? 2 : 1,
          unitPrice: order.ear === 'both' ? order.price / 2 : order.price,
          grossAmount,
          discountPercent: 0,
          discountValue: 0,
          netAmount: grossAmount,
          taxPercent: 15,
          taxAmount,
          totalAmount: grandTotal,
          warehouseId: 'wh-01',
          isDelivered: order.status === 'delivered',
          isReady: true,
          isTrial: false,
          notes: `تم التحويل تلقائياً من طلب المعمل ${order.orderNo}`,
        },
      ],
      subtotalBeforeTax: grossAmount,
      totalDiscount: 0,
      taxAmount,
      grandTotal,
      depositPaid: 0,
      amountPaid: grandTotal,
      remainingDue: 0,
      paymentMethod: 'mada',
      isInsurance: false,
      deliveryStatus: 'ready',
      status: 'active',
      earmoldOrderId: order.id,
      notes: `فاتورة صادرة عن طلب القالب ${order.orderNo}`,
    };

    db.invoices.unshift(newInvoice);
    order.invoiceId = newInvoice.id;
    writeDb(db);

    logAudit(
      'CONVERT_ORDER_TO_INVOICE',
      'INVOICE',
      newInvoice.id,
      `تحويل طلب القالب ${order.orderNo} إلى الفاتورة ${newInvoice.invoiceNo} بقيمة ${grandTotal} ر.س`
    );

    return NextResponse.json({ invoice: newInvoice, order });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to convert order to invoice' }, { status: 500 });
  }
}
