const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkActualTimes() {
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-24T00:00:00'),
        lt: new Date('2025-11-25T00:00:00')
      }
    },
    select: {
      start: true,
      instructor: { select: { name: true } },
      level: true
    },
    orderBy: { start: 'asc' }
  });
  
  console.log(`📅 Tarjetas del día 24: ${slots.length}\n`);
  
  slots.forEach(s => {
    console.log(`${s.start.toISOString()} - ${s.instructor.name} - ${s.level}`);
  });
  
  prisma.$disconnect();
}

checkActualTimes();
