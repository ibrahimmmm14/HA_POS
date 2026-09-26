import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    branches: db.branches,
    warehouses: db.warehouses,
    users: db.users,
    doctors: db.doctors,
    hospitals: db.hospitals,
    insuranceCompanies: db.insuranceCompanies,
  });
}
