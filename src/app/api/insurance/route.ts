import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();
    if (!body.nameAr?.trim()) {
      return NextResponse.json({ error: 'nameAr is required' }, { status: 400 });
    }

    const coverage = Number(body.defaultCoveragePercent);
    const company = await prisma.insuranceCompany.create({
      data: {
        id: `ins-${Date.now()}`,
        code: body.code?.trim() || `INS-${Date.now().toString().slice(-5)}`,
        nameAr: body.nameAr.trim(),
        nameEn: body.nameEn?.trim() || body.nameAr.trim(),
        phone: body.phone?.trim() || '',
        defaultCoveragePercent: Number.isFinite(coverage) ? Math.min(Math.max(coverage, 0), 100) : 0,
        requiresPreApproval: body.requiresPreApproval === true || body.requiresPreApproval === 'true',
      },
    });

    await logAudit('CREATE_INSURANCE', 'INSURANCE', company.id, `تمت إضافة شركة تأمين: ${company.nameAr}`);

    return NextResponse.json({ insuranceCompany: company });
  } catch (error) {
    console.error('Error creating insurance company:', error);
    return NextResponse.json({ error: 'Failed to create insurance company' }, { status: 500 });
  }
}

export const POST = guarded(POSTHandler);
