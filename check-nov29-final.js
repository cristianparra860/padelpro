const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNov29() {
  const hours = await prisma.$queryRaw`
    SELECT DISTINCT strftime('%H:%M', start) as hora
    FROM TimeSlot
    WHERE date(start) = '2025-11-29'
    ORDER BY hora
    LIMIT 5
  `;
  
  console.log('Primeros horarios día 29 (29 nov):');
  hours.forEach(h => console.log(`  ${h.hora}`));
  
  await prisma.$disconnect();
}

checkNov29();
