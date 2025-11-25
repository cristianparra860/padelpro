const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay30() {
  const hours = await prisma.$queryRaw`
    SELECT DISTINCT strftime('%H:%M', start) as time
    FROM TimeSlot
    WHERE date(start) = '2025-12-18'
    AND courtId IS NULL
    ORDER BY time ASC
    LIMIT 5
  `;
  
  console.log('Primeros horarios día 30 (Dec 18):');
  hours.forEach(h => console.log(`  ${h.time}`));
  
  await prisma.$disconnect();
}

checkDay30();
