const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDB() {
  try {
    // Contar total de TimeSlots
    const totalCount = await prisma.$queryRaw`SELECT COUNT(*) as total FROM TimeSlot`;
    console.log('📊 Total TimeSlots en la BD:', totalCount[0].total);
    
    // Ver primeros 5
    const samples = await prisma.$queryRaw`SELECT id, clubId, start, courtNumber FROM TimeSlot LIMIT 5`;
    
    console.log('\n📋 Primeros 5 TimeSlots:');
    samples.forEach((s, i) => {
      const start = typeof s.start === 'bigint' ? Number(s.start) : s.start;
      const date = new Date(start);
      console.log(`${i+1}. Club: ${s.clubId} | Fecha: ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} | Court: ${s.courtNumber || 'NULL'}`);
    });
    
    // Ver clubs disponibles
    const clubs = await prisma.$queryRaw`SELECT id, name FROM Club`;
    console.log('\n🏢 Clubs en la BD:');
    clubs.forEach((c, i) => {
      console.log(`${i+1}. ${c.id} - ${c.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();
