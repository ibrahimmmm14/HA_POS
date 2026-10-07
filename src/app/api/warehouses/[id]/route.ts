import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const PUT = guarded(async (request: Request, { params }: { params: { id: string } }) => {
  try {
    const body = await request.json();
    const target = await prisma.warehouse.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const data: Record<string, string> = {};
    if (typeof body.nameAr === 'string') {
      if (!body.nameAr.trim()) return NextResponse.json({ error: 'nameAr cannot be empty' }, { status: 400 });
      data.nameAr = body.nameAr.trim();
    }
    if (typeof body.nameEn === 'string') data.nameEn = body.nameEn.trim() || data.nameAr || target.nameAr;
    if (typeof body.code === 'string') {
      const code = body.code.trim().toUpperCase();
      if (!code) return NextResponse.json({ error: 'code cannot be empty' }, { status: 400 });
      const other = await prisma.warehouse.findUnique({ where: { code } });
      if (other && other.id !== target.id) return NextResponse.json({ error: 'code_taken' }, { status: 409 });
      data.code = code;
    }

    // Moving a warehouse to another branch is only safe while nothing is stored in it
    if (typeof body.branchId === 'string' && body.branchId !== target.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: body.branchId }, select: { id: true } });
      if (!branch) return NextResponse.json({ error: 'branch_required' }, { status: 400 });
      const [serials, items, pending] = await Promise.all([
        prisma.serialUnit.count({ where: { warehouseId: target.id } }),
        prisma.item.findMany({ select: { stockByWarehouse: true } }),
        prisma.stockTransfer.count({
          where: { status: { in: ['pending', 'in_transit'] }, OR: [{ fromWarehouseId: target.id }, { toWarehouseId: target.id }] },
        }),
      ]);
      const hasStock = items.some((i) => {
        try { return (JSON.parse(i.stockByWarehouse || '{}')[target.id] || 0) > 0; } catch { return false; }
      });
      if (serials > 0 || hasStock || pending > 0) {
        return NextResponse.json({ error: 'warehouse_not_empty' }, { status: 409 });
      }
      data.branchId = branch.id;
    }

    const warehouse = await prisma.warehouse.update({ where: { id: target.id }, data });
    await logAudit('UPDATE_WAREHOUSE', 'WAREHOUSE', warehouse.id, `تم تعديل المستودع: ${warehouse.nameAr} (${warehouse.code})`);
    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error('Error updating warehouse:', error);
    return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 });
  }
});
