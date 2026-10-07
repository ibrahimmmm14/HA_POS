import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { allowedWarehouses, currentUser, guarded, inScope } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Serial number lookup. The product and where the unit is are shown for every unit, even when it sits in
 * a warehouse the user cannot work with; the patient / invoice only when they belong to the user's branches.
 */
export const GET = guarded(async (request: Request) => {
  try {
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return NextResponse.json({ results: [] });

    const user = currentUser(request);
    const mine = await allowedWarehouses(user);

    const units = await prisma.serialUnit.findMany({
      where: { serialNumber: { contains: q, mode: 'insensitive' } },
      include: {
        item: true,
        branch: { select: { nameAr: true, nameEn: true } },
        warehouse: { select: { nameAr: true, nameEn: true, code: true } },
      },
      orderBy: { serialNumber: 'asc' },
      take: 20,
    });

    const clientIds = Array.from(new Set(units.map((u) => u.clientId).filter((c): c is string => !!c)));
    const invoiceIds = Array.from(new Set(units.map((u) => u.invoiceId).filter((c): c is string => !!c)));
    const [clients, invoices] = await Promise.all([
      prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, nameAr: true, nameEn: true, fileNo: true, branchId: true } }),
      prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceNo: true, date: true, branchId: true } }),
    ]);

    const results = units.map((u) => {
      const client = clients.find((c) => c.id === u.clientId);
      const invoice = invoices.find((i) => i.id === u.invoiceId);
      const { item } = u;
      return {
        id: u.id,
        serialNumber: u.serialNumber,
        status: u.status,
        warrantyEndDate: u.warrantyEndDate,
        // whether the unit sits in a warehouse the user works with
        inMyWarehouses: mine === null || mine.has(u.warehouseId),
        branchId: u.branchId,
        branchNameAr: u.branch.nameAr,
        branchNameEn: u.branch.nameEn,
        warehouseId: u.warehouseId,
        warehouseNameAr: u.warehouse.nameAr,
        warehouseNameEn: u.warehouse.nameEn,
        item: {
          id: item.id,
          sku: item.sku,
          barcode: item.barcode,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          category: item.category,
          brand: item.brand,
          model: item.model,
          salePrice: item.salePrice,
          warrantyMonths: item.warrantyMonths,
        },
        client: client && inScope(user, client.branchId) ? { id: client.id, nameAr: client.nameAr, nameEn: client.nameEn, fileNo: client.fileNo } : null,
        invoice: invoice && inScope(user, invoice.branchId) ? { id: invoice.id, invoiceNo: invoice.invoiceNo, date: invoice.date } : null,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error looking up serials:', error);
    return NextResponse.json({ error: 'Failed to look up serials' }, { status: 500 });
  }
});
