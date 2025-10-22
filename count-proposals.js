const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function count() {
  const total = await prisma.timeSlot.count({
    where: {
      start: {
        gte: new Date('2025-10-01'),
        lt: new Date('2025-11-01')
      },
      courtNumber: null
    }
  });
  console.log('Propuestas en octubre:', total);
  await prisma.$disconnect();
}

count();
