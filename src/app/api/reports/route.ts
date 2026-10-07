import { NextResponse } from 'next/server';
import { prisma, mapItem, mapInvoice } from '@/lib/db';
import { branchScope, currentUser, guarded, scopeFilter } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(request: Request) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    // Everything is limited to the user's own branch(es) unless they are an administrator
    const user = currentUser(request);
    const scope = branchScope(user);

    const [rawInvoices, earmoldOrders, rawItems, branches, doctors, hospitals, scopedWarehouses] =
      await Promise.all([
        prisma.invoice.findMany({ where: { branchId: scopeFilter(user) } }),
        prisma.earmoldOrder.findMany({ where: { client: { branchId: scopeFilter(user) } } }),
        prisma.item.findMany(),
        prisma.branch.findMany({ where: scope ? { id: { in: scope } } : undefined }),
        prisma.doctor.findMany(),
        prisma.hospital.findMany(),
        scope ? prisma.warehouse.findMany({ where: { branchId: { in: scope } }, select: { id: true } }) : Promise.resolve(null),
      ]);

    const invoices = rawInvoices.map(mapInvoice);
    const visibleWarehouses = scopedWarehouses && new Set(scopedWarehouses.map((w) => w.id));
    // Stock counts only cover the warehouses of the user's branches
    const items = rawItems.map(mapItem).map((item) =>
      visibleWarehouses
        ? {
            ...item,
            stockByWarehouse: Object.fromEntries(
              Object.entries(item.stockByWarehouse || {}).filter(([wh]) => visibleWarehouses.has(wh))
            ),
          }
        : item
    );

    // Sales Today
    const todayInvoices = invoices.filter((i) => i.date === todayStr);
    const salesToday = todayInvoices.reduce((acc, i) => acc + i.grandTotal, 0);

    // Sales Month
    const monthInvoices = invoices.filter((i) => i.date.startsWith(currentMonthStr));
    const salesMonth = monthInvoices.reduce((acc, i) => acc + i.grandTotal, 0);

    // Total Outstanding Receivables
    const totalReceivables = invoices.reduce((acc, i) => acc + (i.remainingDue || 0), 0);

    // Active Earmold Lab Orders
    const activeOrdersCount = earmoldOrders.filter(
      (o) => o.status !== 'delivered'
    ).length;

    // Low Stock Items Count
    let lowStockCount = 0;
    for (const item of items) {
      const stockValues = Object.values(item.stockByWarehouse || {});
      const totalStock = stockValues.reduce((a, b) => a + b, 0);
      if (totalStock <= item.minStockLevel) {
        lowStockCount++;
      }
    }

    // Branch Performance
    const branchStats = branches.map((b) => {
      const branchInvoices = invoices.filter((i) => i.branchId === b.id);
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
    const doctorStats = doctors.map((doc) => {
      const docInvoices = invoices.filter((i) => i.doctorId === doc.id);
      const totalSalesReferred = docInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
      const commissionEarned = Number(
        ((totalSalesReferred * doc.commissionPercent) / 100).toFixed(2)
      );
      const hospital = hospitals.find((h) => h.id === doc.hospitalId);
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
    const insuranceInvoices = invoices.filter((i) => i.isInsurance);
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
        totalInvoicesCount: invoices.length,
      },
      branchStats,
      doctorStats,
      insuranceStats: {
        claimsCount: insuranceInvoices.length,
        totalClaimed: insuranceTotalClaimed,
        totalCopay: patientTotalCopay,
      },
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
