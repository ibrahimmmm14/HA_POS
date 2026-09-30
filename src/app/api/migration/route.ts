import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    let importedCount = 0;

    if (type === 'clients') {
      for (const row of records) {
        if (!row.nameAr && !row.nameEn) continue;

        const id = `cl-mig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const fileNo = row.fileNo || `F-MIG-${Math.floor(1000 + Math.random() * 9000)}`;

        await prisma.client.create({
          data: {
            id,
            fileNo,
            nationalId: row.nationalId || '',
            nameAr: row.nameAr || row.nameEn || 'عميل مستورد',
            nameEn: row.nameEn || row.nameAr || 'Imported Client',
            phone: row.phone || '',
            secondaryPhone: row.secondaryPhone || null,
            gender: row.gender === 'female' ? 'female' : 'male',
            dob: row.dob || '1980-01-01',
            age: Number(row.age) || 45,
            cityAr: row.cityAr || 'الرياض',
            cityEn: row.cityEn || 'Riyadh',
            address: row.address || '',
            doctorId: null,
            hospitalId: null,
            insuranceId: null,
            insurancePolicyNo: null,
            notes: row.notes || 'بيانات مستوردة من النظام القديم',
            createdAt: new Date().toISOString().split('T')[0],
          },
        });
        importedCount++;
      }
    } else if (type === 'items') {
      for (const row of records) {
        if (!row.nameAr && !row.nameEn) continue;

        const id = `item-mig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const sku = row.sku || `SKU-MIG-${Math.floor(1000 + Math.random() * 9000)}`;
        const barcode = row.barcode || `628999${Math.floor(100000 + Math.random() * 900000)}`;

        const stockObj = {
          'wh-01': Number(row.stockWh1) || 0,
          'wh-02': Number(row.stockWh2) || 0,
          'wh-03': Number(row.stockWh3) || 0,
        };

        await prisma.item.create({
          data: {
            id,
            sku,
            barcode,
            nameAr: row.nameAr || row.nameEn || 'صنف مستورد',
            nameEn: row.nameEn || row.nameAr || 'Imported Item',
            category: row.category || 'accessories',
            brand: row.brand || 'Generic',
            model: row.model || 'Standard',
            unit: row.unit || 'قطعة',
            costPrice: Number(row.costPrice) || 0,
            salePrice: Number(row.salePrice) || 0,
            taxRate: 0.15,
            hasSerials: row.hasSerials === 'true' || row.hasSerials === true,
            warrantyMonths: Number(row.warrantyMonths) || 0,
            minStockLevel: Number(row.minStockLevel) || 5,
            image: null,
            stockByWarehouse: JSON.stringify(stockObj),
          },
        });
        importedCount++;
      }
    }

    await logAudit(
      'MIGRATION_IMPORT',
      'MIGRATION',
      `mig-${Date.now()}`,
      `تم استيراد ${importedCount} سجل بنجاح من نوع ${type}`
    );

    return NextResponse.json({ success: true, importedCount });
  } catch (error) {
    console.error('Error during data migration import:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
