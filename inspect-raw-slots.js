const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectRaw() {
  const slots = await prisma.$queryRaw`
    SELECT id, start, clubId, instructorId, courtId 
    FROM TimeSlot 
    WHERE instructorId = 'instructor-alex-garcia'
    AND clubId = 'padel-estrella-madrid'
    AND courtId IS NULL
    LIMIT 10
  `;
  
  console.log('Found', slots.length, 'proposals for instructor-alex-garcia');
  slots.forEach(s => {
    console.log(`  ${s.start} - courtId: ${s.courtId}`);
  });
  
  await prisma.$disconnect();
}

inspectRaw();
