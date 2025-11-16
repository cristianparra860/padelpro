const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeSlots() {
  try {
    const startOfDay = new Date('2025-11-16T00:00:00.000Z');
    const endOfDay = new Date('2025-11-16T23:59:59.999Z');
    
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    console.log('📅 Buscando clases para 2025-11-16');
    console.log('🕐 Timestamps:', { startTimestamp, endTimestamp });
    
    const slots = await prisma.$queryRawUnsafe(`
      SELECT * FROM TimeSlot
      WHERE clubId = 'club-1'
        AND start >= ${startTimestamp}
        AND start <= ${endTimestamp}
      ORDER BY start
      LIMIT 5
    `);
    
    console.log('\n📊 Total slots encontrados:', slots.length);
    
    if (slots.length > 0) {
      console.log('\n📋 Primeros 5 slots:');
      slots.forEach((s, i) => {
        const d = new Date(Number(s.start));
        const time = d.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        console.log(`${i+1}. ${time} - Court: ${s.courtNumber || 'NULL'} - ID: ${s.id.substring(0, 15)}...`);
      });
    } else {
      console.log('\n⚠️ No hay slots para este día');
      
      // Intentar encontrar el primer slot disponible
      const anySlot = await prisma.$queryRaw`SELECT * FROM TimeSlot LIMIT 1`;
      if (anySlot.length > 0) {
        const firstDate = new Date(Number(anySlot[0].start));
        console.log(`\n💡 Pero sí hay slots en la BD. Primer slot: ${firstDate.toLocaleDateString('es-ES')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeSlots();
