const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Simular exactamente lo que hace la API
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const localMidnight = new Date(year, month, day, 0, 0, 0, 0);
    const startDate = localMidnight.toISOString();
    
    console.log('📅 Simulando API del calendario:\n');
    console.log('Fecha local midnight:', localMidnight);
    console.log('startDate ISO:', startDate);
    
    const adjustedStartDate = new Date(startDate);
    const startISO = adjustedStartDate.toISOString();
    
    console.log('adjustedStartDate:', adjustedStartDate);
    console.log('startISO para query:', startISO);
    
    // Query SQL exacto
    console.log('\n🔍 Ejecutando query SQL...\n');
    
    const results = await prisma.$queryRaw`
      SELECT 
        id, start, instructorId, courtNumber
      FROM TimeSlot
      WHERE start >= ${startISO}
        AND courtNumber IS NULL
      ORDER BY start ASC
      LIMIT 10
    `;
    
    console.log(`Resultados: ${results.length} slots\n`);
    
    results.forEach((r, i) => {
      const d = new Date(r.start);
      console.log(`${i + 1}. ${d.toLocaleString('es-ES')} | UTC: ${r.start}`);
    });
    
    // Verificar si hay slots de 8:00-8:30 en la DB
    console.log('\n🔍 Slots de 8:00-8:30 en DB:\n');
    
    const morning = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: new Date('2025-11-14T07:00:00.000Z'),
          lt: new Date('2025-11-14T08:00:00.000Z')
        },
        courtNumber: null
      },
      take: 5
    });
    
    console.log(`Total: ${morning.length} slots`);
    morning.forEach(s => {
      const d = new Date(s.start);
      console.log(`  ${d.toLocaleString('es-ES')} | ${s.start}`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
