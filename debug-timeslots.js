const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTimeSlots() {
  try {
    console.log('\n🔍 DEBUG: Verificando TimeSlots\n');
    
    // Ver TODOS los TimeSlots
    const all = await prisma.$queryRaw`
      SELECT 
        id, 
        datetime(start) as start_formatted,
        level,
        courtNumber
      FROM TimeSlot
      ORDER BY start
      LIMIT 15
    `;
    
    console.log(`Total TimeSlots: ${all.length}\n`);
    all.forEach((slot, i) => {
      console.log(`${i+1}. ${slot.start_formatted} - ${slot.level} - Pista: ${slot.courtNumber || 'NULL ✅'}`);
    });

    // Ver solo los que cumplen el filtro (courtNumber IS NULL)
    const available = await prisma.$queryRaw`
      SELECT 
        id,
        datetime(start) as start_formatted,
        level
      FROM TimeSlot
      WHERE courtNumber IS NULL
      ORDER BY start
      LIMIT 10
    `;
    
    console.log(`\n\n📋 TimeSlots DISPONIBLES (courtNumber IS NULL): ${available.length}\n`);
    available.forEach((slot, i) => {
      console.log(`${i+1}. ${slot.start_formatted} - ${slot.level}`);
    });

    // Verificar formato de fecha
    const today = await prisma.$queryRaw`
      SELECT 
        id,
        start,
        date(start) as date_only
      FROM TimeSlot
      WHERE courtNumber IS NULL
      LIMIT 3
    `;
    
    console.log(`\n\n🗓️ Formato de fechas:\n`);
    today.forEach(slot => {
      console.log(`   ${slot.id}`);
      console.log(`   start: ${slot.start}`);
      console.log(`   date: ${slot.date_only}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugTimeSlots();
