import { NextResponse } from 'next/server';
import { prisma, mapUser } from '@/lib/db';

export async function GET() {
  try {
    const [branches, warehouses, rawUsers, doctors, hospitals, insuranceCompanies] =
      await Promise.all([
        prisma.branch.findMany(),
        prisma.warehouse.findMany(),
        prisma.user.findMany(),
        prisma.doctor.findMany(),
        prisma.hospital.findMany(),
        prisma.insuranceCompany.findMany(),
      ]);

    return NextResponse.json({
      branches,
      warehouses,
      users: rawUsers.map(mapUser),
      doctors,
      hospitals,
      insuranceCompanies,
    });
  } catch (error) {
    console.error('Error fetching branch master data:', error);
    return NextResponse.json({ error: 'Failed to fetch branch data' }, { status: 500 });
  }
}
