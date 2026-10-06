import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.nameAr?.trim() || !body.hospitalId) {
      return NextResponse.json({ error: 'nameAr and hospitalId are required' }, { status: 400 });
    }

    const doctor = await prisma.doctor.create({
      data: {
        id: `doc-${Date.now()}`,
        nameAr: body.nameAr.trim(),
        nameEn: body.nameEn?.trim() || body.nameAr.trim(),
        specialtyAr: body.specialtyAr?.trim() || 'طبيب أنف وأذن وحنجرة',
        specialtyEn: body.specialtyEn?.trim() || 'ENT Specialist',
        phone: body.phone?.trim() || '',
        hospitalId: body.hospitalId,
        commissionPercent: Number(body.commissionPercent) || 0,
      },
    });

    await logAudit('CREATE_DOCTOR', 'DOCTOR', doctor.id, `تمت إضافة طبيب: ${doctor.nameAr}`);

    return NextResponse.json({ doctor });
  } catch (error) {
    console.error('Error creating doctor:', error);
    return NextResponse.json({ error: 'Failed to create doctor' }, { status: 500 });
  }
}
