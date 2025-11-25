const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDay29() {
  const deleted = await prisma.timeSlot.deleteMany({
    where: {
      start: {
        gte: new Date('2025-11-29T00:00:00.000Z'),
        lt: new Date('2025-11-30T00:00:00.000Z')
      },
      courtId: null // Solo propuestas
    }
  });
  
  console.log('Deleted proposals for 2025-11-29:', deleted.count);
  await prisma.$disconnect();
}

cleanDay29();
