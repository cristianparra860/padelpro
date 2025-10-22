import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInsertedToday() {
  console.log('🔍 Checking inserted data for today');
  console.log('');
  
  // Get the last 10 inserted records
  const recent = await prisma.timeSlot.findMany({
    where: { courtId: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      start: true,
      end: true,
      createdAt: true,
      instructorId: true
    }
  });
  
  console.log(`📊 Last ${recent.length} proposals inserted:`);
  recent.forEach(slot => {
    console.log(`\nID: ${slot.id.substring(0, 15)}...`);
    console.log(`Start: ${slot.start}`);
    console.log(`End: ${slot.end}`);
    console.log(`Created: ${slot.createdAt}`);
    console.log(`Instructor: ${slot.instructorId}`);
  });
  
  await prisma.$disconnect();
}

checkInsertedToday();
