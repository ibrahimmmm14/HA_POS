import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler() {
  try {
    const [branches, warehouses, doctors, hospitals, insuranceCompanies] =
      await Promise.all([
        prisma.branch.findMany(),
        prisma.warehouse.findMany(),
        prisma.doctor.findMany(),
        prisma.hospital.findMany(),
        prisma.insuranceCompany.findMany(),
      ]);

    return NextResponse.json({
      branches,
      warehouses,
      doctors,
      hospitals,
      insuranceCompanies,
    });
  } catch (error) {
    console.error('Error fetching branch master data:', error);
    return NextResponse.json({ error: 'Failed to fetch branch data' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();
    if (!body.nameAr?.trim() || !body.code?.trim()) {
      return NextResponse.json({ error: 'nameAr and code are required' }, { status: 400 });
    }

    const stamp = Date.now();
    const branchId = `br-${stamp}`;
    const warehouseId = `wh-${stamp}`;
    const code = body.code.trim().toUpperCase();
    const nameAr = body.nameAr.trim();
    const nameEn = body.nameEn?.trim() || nameAr;

    // Every branch needs a default warehouse, so create both together.
    const [branch, warehouse] = await prisma.$transaction([
      prisma.branch.create({
        data: {
          id: branchId,
          code,
          nameAr,
          nameEn,
          cityAr: body.cityAr?.trim() || 'الرياض',
          cityEn: body.cityEn?.trim() || 'Riyadh',
          addressAr: body.addressAr?.trim() || '',
          addressEn: body.addressEn?.trim() || '',
          phone: body.phone?.trim() || '',
          taxNumber: body.taxNumber?.trim() || '',
          defaultWarehouseId: warehouseId,
        },
      }),
      prisma.warehouse.create({
        data: {
          id: warehouseId,
          branchId,
          code: `WH-${code}`,
          nameAr: `مستودع ${nameAr}`,
          nameEn: `${nameEn} Warehouse`,
        },
      }),
    ]);

    await logAudit('CREATE_BRANCH', 'BRANCH', branch.id, `تمت إضافة فرع: ${branch.nameAr} (${branch.code})`);

    return NextResponse.json({ branch, warehouse });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
