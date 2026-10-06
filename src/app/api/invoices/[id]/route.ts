import { NextResponse } from 'next/server';
import { prisma, mapInvoice, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceRaw = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        doctor: true,
        hospital: true,
        branch: true,
      },
    });

    if (!invoiceRaw) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { client, doctor, hospital, branch, ...raw } = invoiceRaw;
    const invoice = mapInvoice(raw);

    let insuranceCompany = null;
    if (invoice.insuranceDetails?.companyId) {
      insuranceCompany = await prisma.insuranceCompany.findUnique({
        where: { id: invoice.insuranceDetails.companyId },
      });
    }

    return NextResponse.json({
      invoice,
      client,
      doctor,
      hospital,
      branch,
      insuranceCompany,
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

async function PUTHandler(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const {
      id: _id,
      client: _client,
      doctor: _doctor,
      hospital: _hospital,
      branch: _branch,
      clientNameAr: _cAr,
      clientNameEn: _cEn,
      clientPhone: _cPh,
      doctorNameAr: _dAr,
      branchNameAr: _bAr,
      ...updateData
    } = body;

    if (updateData.lines && typeof updateData.lines !== 'string') {
      updateData.lines = JSON.stringify(updateData.lines);
    }
    if (updateData.paymentDetails && typeof updateData.paymentDetails !== 'string') {
      updateData.paymentDetails = JSON.stringify(updateData.paymentDetails);
    }
    if (updateData.insuranceDetails && typeof updateData.insuranceDetails !== 'string') {
      updateData.insuranceDetails = JSON.stringify(updateData.insuranceDetails);
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAudit(
      'UPDATE_INVOICE',
      'INVOICE',
      params.id,
      `تعديل الفاتورة رقم ${updated.invoiceNo}`
    );

    return NextResponse.json({ invoice: mapInvoice(updated) });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const PUT = guarded(PUTHandler);
