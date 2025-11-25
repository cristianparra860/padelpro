const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  const slots = await prisma.timeSlot.findMany({
    where: {
      clubId: 'padel-estrella-madrid'
    },
    orderBy: {
      start: 'asc'
    },
    take: 20
  });
  
  console.log(`📅 Primeros 20 slots en la base de datos:\n`);
  
  slots.forEach(slot => {
    const date = new Date(slot.start);
    console.log(`   ${date.toISOString()} | ${slot.instructor?.name || 'Sin instructor'} | ${slot.level}`);
  });
  
  await prisma.$disconnect();
}

checkDates();
