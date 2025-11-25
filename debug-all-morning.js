const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  // Buscar las de 07:00 directamente
  const morning = await prisma.$queryRaw`
    SELECT start
    FROM TimeSlot
    WHERE clubId = 'padel-estrella-madrid'
    AND date(start) = '2025-11-29'
    ORDER BY start
    LIMIT 15
  `;
  
  console.log('Primeras 15 clases del 29 nov:');
  morning.forEach((r, i) => {
    console.log(`${i+1}. ${r.start}`);
  });
  
  await prisma.$disconnect();
}

debug();
