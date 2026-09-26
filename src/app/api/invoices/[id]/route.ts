import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = readDb();
  const invoice = db.invoices.find((i) => i.id === params.id);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const client = db.clients.find((c) => c.id === invoice.clientId);
  const doctor = db.doctors.find((d) => d.id === invoice.doctorId);
  const hospital = db.hospitals.find((h) => h.id === invoice.hospitalId);
  const branch = db.branches.find((b) => b.id === invoice.branchId);
  const insuranceCompany = invoice.insuranceDetails?.companyId
    ? db.insuranceCompanies.find((ic) => ic.id === invoice.insuranceDetails?.companyId)
    : undefined;

  return NextResponse.json({
    invoice,
    client,
    doctor,
    hospital,
    branch,
    insuranceCompany,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = readDb();
    const index = db.invoices.findIndex((i) => i.id === params.id);

    if (index === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    db.invoices[index] = { ...db.invoices[index], ...body };
    writeDb(db);

    logAudit(
      'UPDATE_INVOICE',
      'INVOICE',
      params.id,
      `تعديل الفاتورة رقم ${db.invoices[index].invoiceNo}`
    );

    return NextResponse.json({ invoice: db.invoices[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
