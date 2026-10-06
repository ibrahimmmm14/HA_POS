import { NextResponse } from 'next/server';
import { prisma, mapInvoice, mapItem, logAudit } from '@/lib/db';
import { InvoiceLine } from '@/types';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const search = searchParams.get('search')?.toLowerCase().trim();
    const clientId = searchParams.get('clientId');

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(branchId && branchId !== 'all' ? { branchId } : {}),
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
        doctor: {
          select: {
            nameAr: true,
          },
        },
        branch: {
          select: {
            nameAr: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    let mapped = invoices.map((inv) => {
      const { client, doctor, branch, ...raw } = inv;
      return {
        ...mapInvoice(raw),
        clientNameAr: client?.nameAr || 'غير محدد',
        clientNameEn: client?.nameEn || 'Unknown',
        clientPhone: client?.phone || '',
        doctorNameAr: doctor?.nameAr || '-',
        branchNameAr: branch?.nameAr || '-',
      };
    });

    if (search) {
      mapped = mapped.filter(
        (inv) =>
          inv.invoiceNo.toLowerCase().includes(search) ||
          inv.sellerName.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ invoices: mapped });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();

    const invoiceCount = await prisma.invoice.count();
    const invoiceNo =
      body.invoiceNo ||
      `INV-${new Date().getFullYear()}-${String(invoiceCount + 92).padStart(4, '0')}`;

    const id = body.id || `inv-${Date.now()}`;
    const lines: InvoiceLine[] = body.lines || [];

    // Process stock decrements and serial updates
    for (const line of lines) {
      if (!line.itemId) continue;

      const rawItem = await prisma.item.findUnique({
        where: { id: line.itemId },
      });

      if (rawItem) {
        const item = mapItem(rawItem);
        const whId = line.warehouseId || body.warehouseId || 'wh-01';
        const currentStock = item.stockByWarehouse[whId] || 0;
        const newStock = Math.max(0, currentStock - (line.quantity || 1));
        item.stockByWarehouse[whId] = newStock;

        await prisma.item.update({
          where: { id: line.itemId },
          data: {
            stockByWarehouse: JSON.stringify(item.stockByWarehouse),
          },
        });

        // Update serial numbers if provided
        if (line.serialNumbers && line.serialNumbers.length > 0) {
          for (const sn of line.serialNumbers) {
            const serialUnit = await prisma.serialUnit.findUnique({
              where: { serialNumber: sn },
            });

            if (serialUnit) {
              let warrantyEndDate: string | null = null;
              if (item.warrantyMonths > 0) {
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + item.warrantyMonths);
                warrantyEndDate = expiry.toISOString().split('T')[0];
              }

              await prisma.serialUnit.update({
                where: { serialNumber: sn },
                data: {
                  status: 'sold',
                  clientId: body.clientId,
                  invoiceId: id,
                  ...(warrantyEndDate ? { warrantyEndDate } : {}),
                },
              });
            }
          }
        }
      }
    }

    const created = await prisma.invoice.create({
      data: {
        id,
        invoiceNo,
        date: body.date || new Date().toISOString().split('T')[0],
        deliveryDate:
          body.deliveryDate || new Date().toISOString().replace('T', ' ').substring(0, 16),
        branchId: body.branchId || 'br-01',
        warehouseId: body.warehouseId || 'wh-01',
        costCenter: body.costCenter || 'CC-MAIN-01',
        workshop: body.workshop || 'معمل الرياض المركزي',
        clientId: body.clientId,
        doctorId: body.doctorId || null,
        hospitalId: body.hospitalId || null,
        sellerName: body.sellerName || 'موظف المبيعات',
        lines: JSON.stringify(lines),
        subtotalBeforeTax: Number(body.subtotalBeforeTax) || 0,
        totalDiscount: Number(body.totalDiscount) || 0,
        taxAmount: Number(body.taxAmount) || 0,
        grandTotal: Number(body.grandTotal) || 0,
        depositPaid: Number(body.depositPaid) || 0,
        amountPaid: Number(body.amountPaid) || 0,
        remainingDue: Number(body.remainingDue) || 0,
        paymentMethod: body.paymentMethod || 'cash',
        paymentDetails: body.paymentDetails ? JSON.stringify(body.paymentDetails) : null,
        isInsurance: Boolean(body.isInsurance),
        insuranceDetails: body.insuranceDetails ? JSON.stringify(body.insuranceDetails) : null,
        deliveryStatus: body.deliveryStatus || 'delivered',
        returnOfInvoiceId: body.returnOfInvoiceId || null,
        status: body.status || 'active',
        earmoldOrderId: body.earmoldOrderId || null,
        notes: body.notes || null,
      },
    });

    const newInvoice = mapInvoice(created);

    // Auto-create invoice SMS/WhatsApp log
    const client = await prisma.client.findUnique({
      where: { id: newInvoice.clientId },
    });

    if (client) {
      await prisma.messageLog.create({
        data: {
          id: `msg-${Date.now()}`,
          clientId: client.id,
          clientName: client.nameAr,
          phone: client.phone,
          channel: 'whatsapp',
          trigger: 'invoice_receipt',
          content: `شكراً لثقتكم بنا، عزيزنا ${client.nameAr}. تم إصدار فاتورتكم رقم (${newInvoice.invoiceNo}) بمبلغ إجمالي ${newInvoice.grandTotal} ر.س والمتبقي ${newInvoice.remainingDue} ر.س.`,
          status: 'delivered',
          sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      });
    }

    await logAudit(
      'CREATE_INVOICE',
      'INVOICE',
      newInvoice.id,
      `إصدار فاتورة مبيعات جديدة رقم ${newInvoice.invoiceNo} بإجمالي ${newInvoice.grandTotal} ر.س للمريض ${client?.nameAr || ''}`
    );

    return NextResponse.json({ invoice: newInvoice });
  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
