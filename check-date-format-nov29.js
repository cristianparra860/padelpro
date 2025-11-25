const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDateFormat() {
  const slots = await prisma.$queryRaw`
    SELECT id, start, typeof(start) as start_type
    FROM TimeSlot
    WHERE date(start) = '2025-11-29'
    LIMIT 5
  `;
  
  console.log('Date format check:');
  slots.forEach(slot => {
    console.log(`  ID: ${slot.id.substring(0, 15)}...`);
    console.log(`  Start: ${slot.start}`);
    console.log(`  Type: ${slot.start_type}`);
    console.log(`  As Date: ${new Date(slot.start)}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkDateFormat();
