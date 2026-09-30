/**
 * Extra test data for HA_POS (idempotent - safe to re-run).
 * Run with: npm run db:seed:test
 * Requires the base seed (npx prisma db seed) to have run first.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const people = [
  ['أحمد بن علي العتيبي', 'Ahmed Ali Al-Otaibi', 'male', 1955],
  ['فاطمة بنت خالد الشمري', 'Fatima Khaled Al-Shammari', 'female', 1962],
  ['عبدالله بن سعد المطيري', 'Abdullah Saad Al-Mutairi', 'male', 1948],
  ['سارة بنت محمد الغامدي', 'Sara Mohammed Al-Ghamdi', 'female', 1990],
  ['يوسف بن إبراهيم الزهراني', 'Yousef Ibrahim Al-Zahrani', 'male', 1975],
  ['هند بنت عبدالرحمن الحربي', 'Hind Abdulrahman Al-Harbi', 'female', 1958],
  ['ناصر بن فهد الدوسري', 'Nasser Fahad Al-Dosari', 'male', 1966],
  ['ريم بنت سلمان القحطاني', 'Reem Salman Al-Qahtani', 'female', 1983],
  ['عمر بن حسن الشهري', 'Omar Hassan Al-Shehri', 'male', 1950],
  ['لطيفة بنت ناصر السبيعي', 'Latifa Nasser Al-Subaie', 'female', 1971],
] as const;

const cities = [
  ['الرياض', 'Riyadh'],
  ['جدة', 'Jeddah'],
  ['الدمام', 'Dammam'],
];

async function main() {
  const branch = await prisma.branch.findFirst();
  const warehouse = await prisma.warehouse.findFirst({ where: { branchId: branch?.id } });
  const item = await prisma.item.findFirst({ where: { sku: 'BAT-312-RAY' } });
  if (!branch || !warehouse || !item) {
    throw new Error('Base data missing - run `npx prisma db seed` first.');
  }

  for (let i = 0; i < people.length; i++) {
    const [nameAr, nameEn, gender, year] = people[i];
    const n = String(i + 1).padStart(2, '0');
    const [cityAr, cityEn] = cities[i % cities.length];
    const id = `cl-test-${n}`;

    await prisma.client.upsert({
      where: { id },
      update: {},
      create: {
        id,
        fileNo: `F-TEST-${n}`,
        nationalId: `10990000${n}`,
        nameAr,
        nameEn,
        phone: `05000000${n}`,
        gender,
        dob: `${year}-06-15`,
        age: 2026 - year,
        cityAr,
        cityEn,
        address: `${cityAr}، حي تجريبي ${n}`,
        notes: 'بيانات تجريبية',
        createdAt: '2026-09-01',
      },
    });

    // Audiogram for the first 6 test clients
    if (i < 6) {
      const base = 20 + i * 5;
      const freqs = [125, 250, 500, 1000, 2000, 4000, 8000];
      const curve = (off: number) =>
        Object.fromEntries(freqs.map((f, k) => [f, base + off + k * 5]));
      await prisma.audiogram.upsert({
        where: { id: `aud-test-${n}` },
        update: {},
        create: {
          id: `aud-test-${n}`,
          clientId: id,
          date: '2026-09-10',
          audiologistName: 'د. هدى الشهري',
          testType: 'فحص النغمات النقية (تجريبي)',
          frequencies: JSON.stringify(freqs),
          leftAir: JSON.stringify(curve(0)),
          rightAir: JSON.stringify(curve(-5)),
          leftBone: JSON.stringify(curve(-10)),
          rightBone: JSON.stringify(curve(-15)),
          ptaLeft: base + 15,
          ptaRight: base + 10,
          sdsLeft: 90 - i * 3,
          sdsRight: 92 - i * 3,
          notes: 'بيانات تجريبية',
        },
      });
    }

    // Small POS-style invoice for the first 5 test clients
    if (i < 5) {
      const qty = i + 1;
      const net = 45 * qty;
      const tax = +(net * 0.15).toFixed(2);
      const total = +(net + tax).toFixed(2);
      await prisma.invoice.upsert({
        where: { id: `inv-test-${n}` },
        update: {},
        create: {
          id: `inv-test-${n}`,
          invoiceNo: `INV-TEST-${n}`,
          date: '2026-09-20',
          deliveryDate: '2026-09-20 12:00',
          branchId: branch.id,
          warehouseId: warehouse.id,
          costCenter: 'CC-TEST',
          workshop: '-',
          clientId: id,
          sellerName: 'فيصل الحربي',
          lines: JSON.stringify([
            {
              id: `ln-test-${n}`,
              itemId: item.id,
              itemCode: item.sku,
              itemNameAr: item.nameAr,
              itemNameEn: item.nameEn,
              unit: 'كرتون',
              quantity: qty,
              unitPrice: 45,
              grossAmount: net,
              discountPercent: 0,
              discountValue: 0,
              netAmount: net,
              taxPercent: 15,
              taxAmount: tax,
              totalAmount: total,
              warehouseId: warehouse.id,
              isDelivered: true,
              isReady: true,
              isTrial: false,
            },
          ]),
          subtotalBeforeTax: net,
          totalDiscount: 0,
          taxAmount: tax,
          grandTotal: total,
          depositPaid: 0,
          amountPaid: total,
          remainingDue: 0,
          paymentMethod: i % 2 ? 'mada' : 'cash',
          isInsurance: false,
          deliveryStatus: 'delivered',
          status: 'active',
          notes: 'فاتورة تجريبية',
        },
      });
    }
  }
  console.log('✅ Test data added: 10 clients, 6 audiograms, 5 invoices');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
