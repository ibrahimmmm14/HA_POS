import { NextResponse } from 'next/server';
import { prisma, mapStockTransfer, mapItem, logAudit } from '@/lib/db';
import { StockTransfer } from '@/types';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type TransferItem = StockTransfer['items'][number];

async function GETHandler() {
  try {
    const rawTransfers = await prisma.stockTransfer.findMany({
      include: {
        fromBranch: { select: { nameAr: true } },
        toBranch: { select: { nameAr: true } },
        fromWarehouse: { select: { nameAr: true } },
        toWarehouse: { select: { nameAr: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const transfersWithNames = rawTransfers.map((tr) => {
      const { fromBranch, toBranch, fromWarehouse, toWarehouse, ...raw } = tr;
      return {
        ...mapStockTransfer(raw),
        fromBranchNameAr: fromBranch?.nameAr || '-',
        toBranchNameAr: toBranch?.nameAr || '-',
        fromWhNameAr: fromWarehouse?.nameAr || '-',
        toWhNameAr: toWarehouse?.nameAr || '-',
      };
    });

    return NextResponse.json({ transfers: transfersWithNames });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();

    const count = await prisma.stockTransfer.count();
    const transferNo =
      body.transferNo ||
      `TR-${new Date().getFullYear()}-${String(count + 13).padStart(4, '0')}`;

    const items: TransferItem[] = body.items || [];

    const created = await prisma.stockTransfer.create({
      data: {
        id: body.id || `tr-${Date.now()}`,
        transferNo,
        fromBranchId: body.fromBranchId,
        fromWarehouseId: body.fromWarehouseId,
        toBranchId: body.toBranchId,
        toWarehouseId: body.toWarehouseId,
        status: 'pending',
        requestedBy: body.requestedBy || 'أمين المستودع',
        approvedBy: body.approvedBy || null,
        receivedBy: body.receivedBy || null,
        items: JSON.stringify(items),
        createdAt: body.createdAt || new Date().toISOString(),
        completedAt: null,
        notes: body.notes || null,
      },
    });

    const newTransfer = mapStockTransfer(created);

    await logAudit(
      'CREATE_STOCK_TRANSFER',
      'STOCK_TRANSFER',
      newTransfer.id,
      `طلب تحويل مخزني جديد ${newTransfer.transferNo} بقيمة أصناف متعددة`
    );

    return NextResponse.json({ transfer: newTransfer });
  } catch (error) {
    console.error('Error creating stock transfer:', error);
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 });
  }
}

async function PUTHandler(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    const prevTransferRaw = await prisma.stockTransfer.findUnique({
      where: { id },
    });

    if (!prevTransferRaw) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const prevTransfer = mapStockTransfer(prevTransferRaw);
    const prevStatus = prevTransfer.status;

    let completedAt = prevTransfer.completedAt;

    if (status === 'completed' && prevStatus !== 'completed') {
      completedAt = new Date().toISOString();

      // Move stock between warehouses
      for (const itemTr of prevTransfer.items) {
        const rawItem = await prisma.item.findUnique({
          where: { id: itemTr.itemId },
        });

        if (rawItem) {
          const item = mapItem(rawItem);
          const currentFromStock = item.stockByWarehouse[prevTransfer.fromWarehouseId] || 0;
          const currentToStock = item.stockByWarehouse[prevTransfer.toWarehouseId] || 0;

          item.stockByWarehouse[prevTransfer.fromWarehouseId] = Math.max(
            0,
            currentFromStock - itemTr.quantity
          );
          item.stockByWarehouse[prevTransfer.toWarehouseId] = currentToStock + itemTr.quantity;

          await prisma.item.update({
            where: { id: itemTr.itemId },
            data: {
              stockByWarehouse: JSON.stringify(item.stockByWarehouse),
            },
          });
        }

        // Move serial numbers if any
        if (itemTr.serials && itemTr.serials.length > 0) {
          for (const sn of itemTr.serials) {
            await prisma.serialUnit.updateMany({
              where: { serialNumber: sn },
              data: {
                branchId: prevTransfer.toBranchId,
                warehouseId: prevTransfer.toWarehouseId,
              },
            });
          }
        }
      }
    }

    const updatedRaw = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
    });

    const updatedTransfer = mapStockTransfer(updatedRaw);

    await logAudit(
      'UPDATE_TRANSFER_STATUS',
      'STOCK_TRANSFER',
      updatedTransfer.id,
      `تحديث حالة أمر التحويل ${updatedTransfer.transferNo} إلى ${status}`
    );

    return NextResponse.json({ transfer: updatedTransfer });
  } catch (error) {
    console.error('Error updating stock transfer:', error);
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
export const PUT = guarded(PUTHandler);
