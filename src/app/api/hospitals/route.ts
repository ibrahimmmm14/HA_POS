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

    const id = `hosp-${Date.now()}`;
    const hospital = await prisma.hospital.create({
      data: {
        id,
        code: body.code?.trim() || `HOSP-${Date.now().toString().slice(-5)}`,
        nameAr: body.nameAr.trim(),
        nameEn: body.nameEn?.trim() || body.nameAr.trim(),
        cityAr: body.cityAr?.trim() || 'الرياض',
        cityEn: body.cityEn?.trim() || 'Riyadh',
        phone: body.phone?.trim() || '',
      },
    });

    await logAudit('CREATE_HOSPITAL', 'HOSPITAL', hospital.id, `تمت إضافة مستشفى: ${hospital.nameAr}`);

    return NextResponse.json({ hospital });
  } catch (error) {
    console.error('Error creating hospital:', error);
    return NextResponse.json({ error: 'Failed to create hospital' }, { status: 500 });
  }
}

export const POST = guarded(POSTHandler);
