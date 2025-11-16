const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIQuery() {
  try {
    console.log('🔍 SIMULANDO QUERY DE LA API\n');
    
    // Simular exactamente lo que hace la API
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const localMidnight = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startDate = localMidnight.toISOString();
    
    const start = new Date(startDate);
    const future = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const endDate = future.toISOString();
    
    console.log('Fechas calculadas por la API:');
    console.log('  startDate:', startDate);
    console.log('  endDate:', endDate);
    
    // El query exacto que usa la API
    const adjustedStartDate = new Date(startDate);
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    const startISO = adjustedStartDate.toISOString();
    const endISO = adjustedEndDate.toISOString();
    
    console.log('\nQuery SQL:');
    console.log('  WHERE start >= ', startISO);
    console.log('  AND start <= ', endISO);
    
    const classesRaw = await prisma.$queryRaw`
      SELECT id, start, end, courtNumber
      FROM TimeSlot
      WHERE start >= ${startISO}
        AND start <= ${endISO}
      ORDER BY start ASC
    `;
    
    console.log(`\n📊 Resultados: ${classesRaw.length} slots`);
    
    if (classesRaw.length > 0) {
      console.log('\nPrimeros 10 slots:');
      classesRaw.slice(0, 10).forEach((slot, i) => {
        const d = new Date(slot.start);
        console.log(`  ${i+1}. ${d.toLocaleString('es-ES')} | Pista: ${slot.courtNumber || 'Sin asignar'}`);
      });
      
      // Verificar si hay slots de 8:00
      const morning = classesRaw.filter(s => {
        const d = new Date(s.start);
        return d.getHours() === 8 || (d.getHours() === 7 && d.getMinutes() === 0);
      });
      
      console.log(`\n🌅 Slots entre 7:00-8:59 UTC: ${morning.length}`);
      if (morning.length > 0) {
        console.log('Ejemplos:');
        morning.slice(0, 3).forEach(s => {
          const d = new Date(s.start);
          console.log(`  - ${d.toISOString()} → ${d.toLocaleString('es-ES')}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIQuery();
