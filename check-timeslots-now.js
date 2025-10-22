const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeSlots() {
  try {
    console.log('🔍 Verificando TimeSlots...\n');
    
    const slots = await prisma.$queryRaw`
      SELECT 
        id, 
        start, 
        level, 
        courtNumber,
        instructorId
      FROM TimeSlot
      WHERE date(start) >= date('now')
      ORDER BY start
      LIMIT 10
    `;
    
    console.log(`Total: ${slots.length} TimeSlots encontrados\n`);
    
    if (slots.length > 0) {
      console.log('Primeros TimeSlots:');
      slots.forEach((slot, i) => {
        console.log(`${i+1}. ${slot.start} - Nivel: ${slot.level} - Pista: ${slot.courtNumber || 'Sin asignar'}`);
      });
    } else {
      console.log('❌ NO HAY TIMESLOTS en la base de datos');
      console.log('\n💡 Solución: Ejecutar el generador');
      console.log('   node auto-generate-cards.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeSlots();
