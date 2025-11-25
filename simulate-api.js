const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateAPI() {
  // Simular la query del API
  const clubId = 'padel-estrella-madrid';
  const date = '2025-11-29';
  
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);
  
  const startISO = startOfDay.toISOString();
  const endISO = endOfDay.toISOString();
  
  console.log(`Buscando clases entre ${startISO} y ${endISO}\n`);
  
  const slots = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot
    WHERE clubId = ?
    AND start >= ?
    AND start <= ?
    AND courtId IS NULL
    ORDER BY start
  `, clubId, startISO, endISO);
  
  console.log(`Total clases encontradas: ${slots.length}`);
  
  // Contar por hora
  const byHour = {};
  slots.forEach(slot => {
    const hour = new Date(slot.start).getUTCHours();
    byHour[hour] = (byHour[hour] || 0) + 1;
  });
  
  console.log('\nClases por hora:');
  Object.keys(byHour).sort((a, b) => a - b).forEach(hour => {
    console.log(`  ${hour.padStart(2, '0')}:00 - ${byHour[hour]} clases`);
  });
  
  await prisma.$disconnect();
}

simulateAPI();
