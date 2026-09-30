const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const c = await prisma.client.create({
      data: {
        id: 'test-cl-' + Date.now(),
        fileNo: 'F-TEST-' + Math.floor(1000 + Math.random() * 9000),
        nationalId: '1234567890',
        nameAr: 'تجربة مريض',
        nameEn: 'Test Patient',
        phone: '0501234567',
        gender: 'male',
        dob: '1990-01-01',
        age: 34,
        cityAr: 'الرياض',
        cityEn: 'Riyadh',
        address: 'شارع الملك فهد',
        createdAt: '2026-09-30',
      },
    });
    console.log('SUCCESS:', c.id, c.nameAr);
    await prisma.client.delete({ where: { id: c.id } });
    console.log('CLEANED UP');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
