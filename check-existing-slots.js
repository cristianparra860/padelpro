const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExisting() {
  const slots = await prisma.timeSlot.findMany({
    where: {
      instructorId: 'instructor-alex-garcia',
      start: new Date('2025-11-29T08:00:00.000Z')
    }
  });
  
  console.log('TimeSlots found:', slots.length);
  slots.forEach(s => {
    console.log(`  ID: ${s.id}`);
    console.log(`  Start: ${s.start}`);
    console.log(`  Court: ${s.courtId}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkExisting();
