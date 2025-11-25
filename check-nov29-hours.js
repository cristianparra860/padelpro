const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNov29Hours() {
  const slots = await prisma.$queryRaw`
    SELECT DISTINCT strftime('%H:%M', start) as time
    FROM TimeSlot
    WHERE date(start) = '2025-11-29'
    AND courtId IS NULL
    ORDER BY time ASC
  `;
  
  console.log('Horarios generados para Nov 29:');
  slots.forEach(s => {
    console.log(`  ${s.time}`);
  });
  
  await prisma.$disconnect();
}

checkNov29Hours();
