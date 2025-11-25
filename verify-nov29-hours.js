const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyNov29() {
  const count = await prisma.$queryRaw`
    SELECT COUNT(*) as total FROM TimeSlot
    WHERE date(start) = '2025-11-29'
    AND courtId IS NULL
  `;
  
  console.log(`Total proposals Nov 29: ${count[0].total}`);
  
  const hours = await prisma.$queryRaw`
    SELECT DISTINCT strftime('%H:%M', start) as time
    FROM TimeSlot
    WHERE date(start) = '2025-11-29'
    AND courtId IS NULL
    ORDER BY time ASC
    LIMIT 5
  `;
  
  console.log('\nPrimeros horarios:');
  hours.forEach(h => console.log(`  ${h.time}`));
  
  await prisma.$disconnect();
}

verifyNov29();
