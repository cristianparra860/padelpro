const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRawQuery() {
  try {
    const date = '2025-11-24';
    const startISO = date + 'T00:00:00.000Z';
    const endISO = date + 'T23:59:59.999Z';
    
    console.log('🔍 Query similar al API:');
    console.log('   Start:', startISO);
    console.log('   End:', endISO);
    console.log('');
    
    const query = `SELECT * FROM TimeSlot WHERE start >= ? AND start <= ? ORDER BY start ASC`;
    
    const slots = await prisma.$queryRawUnsafe(query, startISO, endISO);
    
    console.log('📊 Slots encontrados:', slots.length);
    console.log('');
    
    if (slots.length > 0) {
      const slots7AM = slots.filter(s => {
        const start = new Date(s.start);
        return start.getUTCHours() === 6 && start.getUTCMinutes() === 0;
      });
      
      console.log('🕐 Slots a las 7:00:', slots7AM.length);
      console.log('');
      
      slots7AM.forEach(s => {
        console.log(`  - ID: ${s.id.substring(0,12)}... | courtId: ${s.courtId ? 'ASIGNADO' : 'NULL'}`);
        console.log(`    start: ${s.start} (${typeof s.start})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRawQuery();
