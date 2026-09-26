import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { Invoice, MessageLog } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId');
  const search = searchParams.get('search')?.toLowerCase();
  const clientId = searchParams.get('clientId');

  const db = readDb();
  let invoices = db.invoices;

  if (branchId && branchId !== 'all') {
    invoices = invoices.filter((inv) => inv.branchId === branchId);
  }
  if (clientId) {
    invoices = invoices.filter((inv) => inv.clientId === clientId);
  }
  if (search) {
    invoices = invoices.filter(
      (inv) =>
        inv.invoiceNo.toLowerCase().includes(search) ||
        inv.sellerName.toLowerCase().includes(search)
    );
  }

  const enrichedInvoices = invoices.map((inv) => {
    const client = db.clients.find((c) => c.id === inv.clientId);
    const doctor = db.doctors.find((d) => d.id === inv.doctorId);
    const branch = db.branches.find((b) => b.id === inv.branchId);
    return {
      ...inv,
      clientNameAr: client?.nameAr || 'غير محدد',
      clientNameEn: client?.nameEn || 'Unknown',
      clientPhone: client?.phone || '',
      doctorNameAr: doctor?.nameAr || '-',
      branchNameAr: branch?.nameAr || '-',
    };
  });

  return NextResponse.json({ invoices: enrichedInvoices });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();

    const invoiceNo = `INV-${new Date().getFullYear()}-${String(db.invoices.length + 92).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      ...body,
      id: `inv-${Date.now()}`,
      invoiceNo,
      date: body.date || new Date().toISOString().split('T')[0],
      status: 'active',
    };

    // Update stock levels & serial numbers
    for (const line of newInvoice.lines) {
      const item = db.items.find((i) => i.id === line.itemId);
      if (item) {
        const whId = line.warehouseId || newInvoice.warehouseId;
        const currentStock = item.stockByWarehouse[whId] || 0;
        item.stockByWarehouse[whId] = Math.max(0, currentStock - line.quantity);

        // Update serial numbers if provided
        if (line.serialNumbers && line.serialNumbers.length > 0) {
          for (const sn of line.serialNumbers) {
            const serialUnit = db.serialUnits.find((s) => s.serialNumber === sn);
            if (serialUnit) {
              serialUnit.status = 'sold';
              serialUnit.clientId = newInvoice.clientId;
              serialUnit.invoiceId = newInvoice.id;
              if (item.warrantyMonths > 0) {
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + item.warrantyMonths);
                serialUnit.warrantyEndDate = expiry.toISOString().split('T')[0];
              }
            }
          }
        }
      }
    }

    db.invoices.unshift(newInvoice);

    // Auto-create invoice SMS/WhatsApp log
    const client = db.clients.find((c) => c.id === newInvoice.clientId);
    if (client) {
      const msg: MessageLog = {
        id: `msg-${Date.now()}`,
        clientId: client.id,
        clientName: client.nameAr,
        phone: client.phone,
        channel: 'whatsapp',
        trigger: 'invoice_receipt',
        content: `شكراً لثقتكم بنا، عزيزنا ${client.nameAr}. تم إصدار فاتورتكم رقم (${newInvoice.invoiceNo}) بمبلغ إجمالي ${newInvoice.grandTotal} ر.س والمتبقي ${newInvoice.remainingDue} ر.س.`,
        status: 'delivered',
        sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      db.messageLogs.unshift(msg);
    }

    writeDb(db);

    logAudit(
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
