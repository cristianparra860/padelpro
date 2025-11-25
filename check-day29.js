const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay29() {
  const count = await prisma.timeSlot.count({
    where: {
      start: {
        gte: new Date('2025-11-29T00:00:00.000Z'),
        lt: new Date('2025-11-29T23:59:59.999Z')
      }
    }
  });
  console.log('TimeSlots for 2025-11-29:', count);
  
  // Ver algunos ejemplos
  const examples = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-29T00:00:00.000Z'),
        lt: new Date('2025-11-29T23:59:59.999Z')
      }
    },
    take: 5
  });
  console.log('\nExamples:');
  examples.forEach(ts => {
    console.log(`  ${ts.start} - courtId: ${ts.courtId} - instructor: ${ts.instructorId}`);
  });
  
  await prisma.$disconnect();
}

checkDay29();
