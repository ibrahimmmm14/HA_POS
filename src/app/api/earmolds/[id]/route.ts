import { NextResponse } from 'next/server';
import { prisma, mapInvoice, logAudit } from '@/lib/db';
import { Invoice } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.earmoldOrder.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { client, ...orderData } = order;
    return NextResponse.json({ order: orderData, client });
  } catch (error) {
    console.error('Error fetching earmold order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const prevOrder = await prisma.earmoldOrder.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!prevOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const {
      id: _id,
      client: _client,
      clientNameAr: _cAr,
      clientNameEn: _cEn,
      clientPhone: _cPh,
      ...updateData
    } = body;

    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.cost !== undefined) updateData.cost = Number(updateData.cost);

    const updatedOrder = await prisma.earmoldOrder.update({
      where: { id: params.id },
      data: updateData,
    });

    // If status changed to 'ready', auto-generate ready notification in messageLog
    if (
      prevOrder.status !== 'ready' &&
      updatedOrder.status === 'ready' &&
      prevOrder.client
    ) {
      await prisma.messageLog.create({
        data: {
          id: `msg-${Date.now()}`,
          clientId: prevOrder.client.id,
          clientName: prevOrder.client.nameAr,
          phone: prevOrder.client.phone,
          channel: 'whatsapp',
          trigger: 'order_ready',
          content: `مرحباً عزيزنا العميل ${prevOrder.client.nameAr}، نود إبلاغكم بأن طلبكم رقم (${updatedOrder.orderNo}) الخاص بالقالب/السماعة الطبية أصبح جاهزاً للاستلام والتجربة. نتشرف بزيارتكم.`,
          status: 'sent',
          sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      });
    }

    await logAudit(
      'UPDATE_EARMOLD_STATUS',
      'EARMOLD_ORDER',
      params.id,
      `تحديث حالة طلب المعمل ${updatedOrder.orderNo} إلى: ${updatedOrder.status}`
    );

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating earmold order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// Convert order to invoice action
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.earmoldOrder.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const client = order.client;
    const invoiceCount = await prisma.invoice.count();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(invoiceCount + 91).padStart(4, '0')}`;

    const grossAmount = order.price;
    const taxAmount = Number((grossAmount * 0.15).toFixed(2));
    const grandTotal = Number((grossAmount + taxAmount).toFixed(2));

    const lines = [
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
    ];

    const newInvoiceRow = await prisma.invoice.create({
      data: {
        id: `inv-${Date.now()}`,
        invoiceNo,
        date: new Date().toISOString().split('T')[0],
        deliveryDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        branchId: 'br-01',
        warehouseId: 'wh-01',
        costCenter: 'CC-WORKSHOP-01',
        workshop: order.workshop,
        clientId: order.clientId,
        doctorId: client?.doctorId || null,
        hospitalId: client?.hospitalId || null,
        sellerName: 'أخصائي المعمل / سامي',
        lines: JSON.stringify(lines),
        subtotalBeforeTax: grossAmount,
        totalDiscount: 0,
        taxAmount,
        grandTotal,
        depositPaid: 0,
        amountPaid: grandTotal,
        remainingDue: 0,
        paymentMethod: 'mada',
        paymentDetails: null,
        isInsurance: false,
        insuranceDetails: null,
        deliveryStatus: 'ready',
        status: 'active',
        earmoldOrderId: order.id,
        notes: `فاتورة صادرة عن طلب القالب ${order.orderNo}`,
      },
    });

    const updatedOrder = await prisma.earmoldOrder.update({
      where: { id: order.id },
      data: { invoiceId: newInvoiceRow.id },
    });

    await logAudit(
      'CONVERT_ORDER_TO_INVOICE',
      'INVOICE',
      newInvoiceRow.id,
      `تحويل طلب القالب ${order.orderNo} إلى الفاتورة ${newInvoiceRow.invoiceNo} بقيمة ${grandTotal} ر.س`
    );

    return NextResponse.json({
      invoice: mapInvoice(newInvoiceRow),
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error converting order to invoice:', error);
    return NextResponse.json({ error: 'Failed to convert order to invoice' }, { status: 500 });
  }
}
