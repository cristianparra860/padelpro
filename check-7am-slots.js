const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: { gte: new Date('2025-11-29T07:00:00.000Z'), lt: new Date('2025-11-29T08:00:00.000Z') }
    },
    select: { id: true, start: true, instructorId: true }
  });
  
  console.log(`Clases de 07:00-08:00 para 29 nov: ${slots.length}`);
  slots.forEach(s => {
    console.log(`  ${s.start.toISOString()} - Instructor: ${s.instructorId}`);
  });
  
  await prisma.$disconnect();
}

check();
