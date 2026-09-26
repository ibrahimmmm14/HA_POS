import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  const db = readDb();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Sales Today
  const todayInvoices = db.invoices.filter((i) => i.date === todayStr);
  const salesToday = todayInvoices.reduce((acc, i) => acc + i.grandTotal, 0);

  // Sales Month
  const monthInvoices = db.invoices.filter((i) => i.date.startsWith(currentMonthStr));
  const salesMonth = monthInvoices.reduce((acc, i) => acc + i.grandTotal, 0);

  // Total Outstanding Receivables
  const totalReceivables = db.invoices.reduce((acc, i) => acc + (i.remainingDue || 0), 0);

  // Active Earmold Lab Orders
  const activeOrdersCount = db.earmoldOrders.filter(
    (o) => o.status !== 'delivered'
  ).length;

  // Low Stock Items Count
  let lowStockCount = 0;
  for (const item of db.items) {
    const totalStock = Object.values(item.stockByWarehouse).reduce((a, b) => a + b, 0);
    if (totalStock <= item.minStockLevel) {
      lowStockCount++;
    }
  }

  // Branch Performance
  const branchStats = db.branches.map((b) => {
    const branchInvoices = db.invoices.filter((i) => i.branchId === b.id);
    const totalSales = branchInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
    return {
      branchId: b.id,
      nameAr: b.nameAr,
      nameEn: b.nameEn,
      invoiceCount: branchInvoices.length,
      totalSales,
    };
  });

  // Doctor Referrals Report
  const doctorStats = db.doctors.map((doc) => {
    const docInvoices = db.invoices.filter((i) => i.doctorId === doc.id);
    const totalSalesReferred = docInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
    const commissionEarned = Number(
      ((totalSalesReferred * doc.commissionPercent) / 100).toFixed(2)
    );
    const hospital = db.hospitals.find((h) => h.id === doc.hospitalId);
    return {
      doctorId: doc.id,
      doctorNameAr: doc.nameAr,
      doctorNameEn: doc.nameEn,
      hospitalNameAr: hospital?.nameAr || '-',
      referralsCount: docInvoices.length,
      totalSalesReferred,
      commissionPercent: doc.commissionPercent,
      commissionEarned,
    };
  });

  // Insurance Claims Breakdown
  const insuranceInvoices = db.invoices.filter((i) => i.isInsurance);
  const insuranceTotalClaimed = insuranceInvoices.reduce(
    (acc, i) => acc + (i.insuranceDetails?.coveredAmount || 0),
    0
  );
  const patientTotalCopay = insuranceInvoices.reduce(
    (acc, i) => acc + (i.insuranceDetails?.patientCopay || 0),
    0
  );

  return NextResponse.json({
    kpis: {
      salesToday,
      salesMonth,
      totalReceivables,
      activeOrdersCount,
      lowStockCount,
      totalInvoicesCount: db.invoices.length,
    },
    branchStats,
    doctorStats,
    insuranceStats: {
      claimsCount: insuranceInvoices.length,
      totalClaimed: insuranceTotalClaimed,
      totalCopay: patientTotalCopay,
    },
  });
}
