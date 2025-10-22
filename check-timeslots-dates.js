const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const slots = await prisma.timeSlot.findMany({
    select: {
      id: true,
      start: true,
      end: true,
      clubId: true,
      level: true
    },
    orderBy: { start: 'asc' }
  });

  console.log(`\n📅 TimeSlots encontrados: ${slots.length}\n`);
  
  slots.forEach(slot => {
    console.log(`   🕐 ${slot.start.toISOString()} - ${slot.end.toISOString()}`);
    console.log(`      Club: ${slot.clubId}, Level: ${slot.level}\n`);
  });

  await prisma.$disconnect();
}

check();
