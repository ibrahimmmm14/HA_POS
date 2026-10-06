import { NextResponse } from 'next/server';
import { prisma, mapInvoice } from '@/lib/db';
import { getSessionUser, guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Finance report for a period.
 *   GET /api/finance?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=br-01]
 *
 * Sales figures come from ACTIVE invoices dated in the period (voided and returned ones are
 * excluded and counted separately). Cost of goods uses each item's CURRENT cost price, so it
 * is an estimate for past periods if prices changed since.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 731;
const round2 = (n: number) => Math.round(n * 100) / 100;

function isValidDate(value: string | null): value is string {
  return !!value && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

const emptyPayments = () => ({ cash: 0, mada: 0, visa: 0, bank_transfer: 0, insurance: 0, deposit: 0, other: 0 });

async function GETHandler(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().split('T')[0];
    const from = searchParams.get('from') || `${today.substring(0, 8)}01`;
    const to = searchParams.get('to') || today;

    if (!isValidDate(from) || !isValidDate(to) || from > to) {
      return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
    }
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > MAX_DAYS) {
      return NextResponse.json({ error: 'range_too_long', maxDays: MAX_DAYS }, { status: 400 });
    }

    // Everyone except the system administrator only sees their own branches.
    const requested = searchParams.get('branchId');
    const allBranches = await prisma.branch.findMany();
    const visible = user.role === 'super_admin' ? allBranches : allBranches.filter((b) => user.branchIds.includes(b.id));
    let branchFilter = visible.map((b) => b.id);
    if (requested && requested !== 'all') {
      if (!branchFilter.includes(requested)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      branchFilter = [requested];
    }

    const [rawInvoices, items, orders, repairs] = await Promise.all([
      prisma.invoice.findMany({ where: { date: { gte: from, lte: to }, branchId: { in: branchFilter } } }),
      prisma.item.findMany(),
      prisma.earmoldOrder.findMany(),
      prisma.repairTicket.findMany({
        where: { status: 'delivered', completedAt: { gte: from, lte: to }, branchId: { in: branchFilter } },
      }),
    ]);

    const itemById = new Map(items.map((i) => [i.id, i]));
    const orderById = new Map(orders.map((o) => [o.id, o]));
    const branchName = new Map(allBranches.map((b) => [b.id, { ar: b.nameAr, en: b.nameEn }]));

    const invoices = rawInvoices.map(mapInvoice);
    const active = invoices.filter((i) => i.status === 'active');
    const excluded = invoices.filter((i) => i.status !== 'active');

    const totals = {
      invoiceCount: active.length,
      grossSales: 0,
      discounts: 0,
      netSales: 0,
      vat: 0,
      totalWithVat: 0,
      collected: 0,
      receivables: 0,
      insuranceBilled: 0,
      costOfGoods: 0,
      grossProfit: 0,
      unknownCostLines: 0,
    };
    const payments = emptyPayments();
    const daily = new Map<string, { date: string; count: number; netSales: number; vat: number; total: number; collected: number; cost: number }>();
    const byBranch = new Map<string, { branchId: string; count: number; netSales: number; total: number; collected: number; receivables: number }>();
    const byCategory = new Map<string, { category: string; net: number; cost: number }>();

    for (const inv of active) {
      const collected = Math.max(inv.grandTotal - (inv.remainingDue || 0), 0);

      // Cost of goods for this invoice
      let invCost = 0;
      for (const line of inv.lines) {
        const item = itemById.get(line.itemId);
        let category = item?.category ?? 'other';
        let lineCost = 0;
        if (item) {
          lineCost = item.costPrice * line.quantity;
        } else if (inv.earmoldOrderId && orderById.has(inv.earmoldOrderId)) {
          // Lab order converted to an invoice: the order carries its own cost
          category = 'earmolds';
          lineCost = orderById.get(inv.earmoldOrderId)!.cost;
        } else {
          totals.unknownCostLines += 1;
        }
        invCost += lineCost;
        const c = byCategory.get(category) ?? { category, net: 0, cost: 0 };
        c.net += line.netAmount;
        c.cost += lineCost;
        byCategory.set(category, c);
      }

      totals.grossSales += inv.subtotalBeforeTax + inv.totalDiscount;
      totals.discounts += inv.totalDiscount;
      totals.netSales += inv.subtotalBeforeTax;
      totals.vat += inv.taxAmount;
      totals.totalWithVat += inv.grandTotal;
      totals.collected += collected;
      totals.receivables += inv.remainingDue || 0;
      totals.costOfGoods += invCost;

      // How it was paid
      const d = inv.paymentDetails;
      if (d) {
        // Some invoices list a deposit separately from the method it was paid with, and some
        // include it in that method too. Pick the reading that adds up to what was collected.
        const methods = (d.cashAmount || 0) + (d.madaAmount || 0) + (d.visaAmount || 0) + (d.insuranceAmount || 0);
        const deposit = d.depositAmount || 0;
        const near = (x: number, y: number) => Math.abs(x - y) < 0.01;
        const countDeposit = near(methods + deposit, collected) || (methods === 0 && near(deposit, collected));
        payments.cash += d.cashAmount || 0;
        payments.mada += d.madaAmount || 0;
        payments.visa += d.visaAmount || 0;
        payments.insurance += d.insuranceAmount || 0;
        if (countDeposit) payments.deposit += deposit;
        const accounted = methods + (countDeposit ? deposit : 0);
        if (collected - accounted > 0.01) payments.other += collected - accounted;
      } else if (inv.paymentMethod in payments) {
        payments[inv.paymentMethod as keyof typeof payments] += collected;
      } else {
        payments.other += collected;
      }
      if (inv.isInsurance) totals.insuranceBilled += inv.insuranceDetails?.coveredAmount ?? d?.insuranceAmount ?? 0;

      const day = daily.get(inv.date) ?? { date: inv.date, count: 0, netSales: 0, vat: 0, total: 0, collected: 0, cost: 0 };
      day.count += 1;
      day.netSales += inv.subtotalBeforeTax;
      day.vat += inv.taxAmount;
      day.total += inv.grandTotal;
      day.collected += collected;
      day.cost += invCost;
      daily.set(inv.date, day);

      const b = byBranch.get(inv.branchId) ?? { branchId: inv.branchId, count: 0, netSales: 0, total: 0, collected: 0, receivables: 0 };
      b.count += 1;
      b.netSales += inv.subtotalBeforeTax;
      b.total += inv.grandTotal;
      b.collected += collected;
      b.receivables += inv.remainingDue || 0;
      byBranch.set(inv.branchId, b);
    }

    totals.grossProfit = totals.netSales - totals.costOfGoods;

    const repairTotals = {
      count: repairs.length,
      charge: repairs.reduce((a, r) => a + r.charge, 0),
      cost: repairs.reduce((a, r) => a + r.cost, 0),
      profit: 0,
    };
    repairTotals.profit = repairTotals.charge - repairTotals.cost;

    const roundObj = <T extends Record<string, unknown>>(o: T): T =>
      Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? round2(v) : v])) as T;

    return NextResponse.json({
      range: { from, to },
      branchId: requested && requested !== 'all' ? requested : 'all',
      totals: roundObj(totals),
      payments: roundObj(payments),
      excluded: {
        count: excluded.length,
        total: round2(excluded.reduce((a, i) => a + i.grandTotal, 0)),
      },
      repairs: roundObj(repairTotals),
      daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)).map(roundObj),
      byBranch: Array.from(byBranch.values()).map((b) => ({ ...roundObj(b), name: branchName.get(b.branchId) ?? { ar: b.branchId, en: b.branchId } })),
      byCategory: Array.from(byCategory.values()).sort((a, b) => b.net - a.net).map(roundObj),
      branches: visible.map((b) => ({ id: b.id, nameAr: b.nameAr, nameEn: b.nameEn })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error building finance report:', error);
    return NextResponse.json({ error: 'Failed to build finance report' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
