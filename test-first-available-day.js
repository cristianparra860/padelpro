const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findFirstDay() {
  try {
    console.log('📅 Buscando primer día con clases...\n');
    
    // Obtener el primer TimeSlot
    const firstSlot = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE clubId = 'club-1'
      ORDER BY start ASC 
      LIMIT 1
    `;
    
    if (firstSlot.length > 0) {
      const date = new Date(Number(firstSlot[0].start));
      const dateStr = date.toISOString().split('T')[0];
      
      console.log('✅ Primer día con clases:', dateStr);
      console.log('🕐 Primera clase:', date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'}));
      
      // Contar cuántas clases hay ese día
      const startOfDay = new Date(dateStr + 'T00:00:00.000Z').getTime();
      const endOfDay = new Date(dateStr + 'T23:59:59.999Z').getTime();
      
      const count = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM TimeSlot
        WHERE clubId = 'club-1'
          AND start >= ${startOfDay}
          AND start <= ${endOfDay}
      `);
      
      console.log(`📊 Total de clases ese día: ${count[0].total}\n`);
      console.log(`💡 Prueba con: http://localhost:9002/activities y selecciona el día ${dateStr}`);
    } else {
      console.log('❌ No hay clases en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findFirstDay();
