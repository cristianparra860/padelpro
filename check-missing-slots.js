const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissingSlots() {
  try {
    console.log('🔍 Verificando slots del día 26...\n');

    const clubId = 'padel-estrella-madrid';
    
    // Verificar slots del día 26
    const date = new Date('2025-11-26');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE clubId = ${clubId}
      AND start >= ${BigInt(startOfDay.getTime())}
      AND start <= ${BigInt(endOfDay.getTime())}
      ORDER BY start ASC
    `;

    console.log(`📊 Total slots del día 26: ${slots.length}`);
    
    if (slots.length > 0) {
      console.log('\n🕐 Primeros 5 slots:');
      slots.slice(0, 5).forEach(slot => {
        const date = new Date(Number(slot.start));
        console.log(`   ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - Instructor: ${slot.instructorId.substring(0, 20)}`);
      });
    }

    // Verificar todas las horas que deberían existir
    const expectedHours = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
                           '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                           '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
                           '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];

    console.log(`\n📋 Horas esperadas: ${expectedHours.length}`);
    console.log(`📋 Horas encontradas: ${slots.length}`);
    
    if (slots.length < expectedHours.length) {
      console.log(`\n⚠️ Faltan ${expectedHours.length - slots.length} slots`);
      
      // Buscar qué horas faltan
      const existingTimes = new Set(slots.map(s => {
        const d = new Date(Number(s.start));
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }));

      const missingHours = expectedHours.filter(h => !existingTimes.has(h));
      console.log('\n❌ Horas faltantes:');
      missingHours.forEach(h => console.log(`   ${h}`));
    } else {
      console.log('\n✅ Todas las horas están cubiertas');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkMissingSlots();
