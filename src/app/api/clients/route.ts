import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim();

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (search) {
      const filtered = clients.filter(
        (c) =>
          c.nameAr.toLowerCase().includes(search) ||
          c.nameEn.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          c.nationalId.includes(search) ||
          c.fileNo.toLowerCase().includes(search)
      );
      return NextResponse.json({ clients: filtered });
    }

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();

    const id = body.id || `cl-${Date.now()}`;
    const fileNo =
      body.fileNo ||
      `F-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = body.createdAt || new Date().toISOString().split('T')[0];

    const newClient = await prisma.client.create({
      data: {
        id,
        fileNo,
        nationalId: body.nationalId || '',
        nameAr: body.nameAr || '',
        nameEn: body.nameEn || '',
        phone: body.phone || '',
        secondaryPhone: body.secondaryPhone || null,
        gender: body.gender || 'male',
        dob: body.dob || '1980-01-01',
        age: Number(body.age) || 0,
        cityAr: body.cityAr || 'الرياض',
        cityEn: body.cityEn || 'Riyadh',
        address: body.address || '',
        doctorId: body.doctorId || null,
        hospitalId: body.hospitalId || null,
        insuranceId: body.insuranceId || null,
        insurancePolicyNo: body.insurancePolicyNo || null,
        notes: body.notes || null,
        createdAt,
      },
    });

    await logAudit(
      'CREATE_CLIENT',
      'CLIENT',
      newClient.id,
      `تم تسجيل ملف مريض جديد: ${newClient.nameAr} (${newClient.fileNo})`
    );

    return NextResponse.json({ client: newClient });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
