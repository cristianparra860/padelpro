const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🔍 BUSCANDO TODOS LOS TIMESLOTS FANTASMA\n');
  console.log('═'.repeat(70));
  
  // Buscar TODOS los TimeSlots con pista asignada pero sin reservas
  const ghostSlots = await prisma.timeSlot.findMany({
    where: {
      courtNumber: { not: null }
    },
    include: {
      bookings: true
    }
  });
  
  console.log(`\nTotal TimeSlots con pista asignada: ${ghostSlots.length}`);
  
  const realGhosts = ghostSlots.filter(slot => slot.bookings.length === 0);
  
  console.log(`TimeSlots FANTASMA (pista asignada sin reservas): ${realGhosts.length}\n`);
  
  if (realGhosts.length === 0) {
    console.log('✅ No hay TimeSlots fantasma. Todo limpio.\n');
    await prisma.$disconnect();
    return;
  }
  
  console.log('FANTASMAS ENCONTRADOS:');
  console.log('─'.repeat(70));
  
  realGhosts.forEach((slot, idx) => {
    const fecha = new Date(slot.start).toLocaleString('es-ES');
    console.log(`${idx + 1}. ${fecha} - Pista ${slot.courtNumber}`);
    console.log(`   ID: ${slot.id}`);
    console.log(`   Nivel: ${slot.level} | Instructor: ${slot.instructorId}`);
  });
  
  console.log('\n🧹 LIMPIANDO...\n');
  
  let cleaned = 0;
  for (const slot of realGhosts) {
    await prisma.timeSlot.update({
      where: { id: slot.id },
      data: { courtNumber: null }
    });
    
    // Limpiar schedules relacionados
    await prisma.courtSchedule.deleteMany({
      where: { timeSlotId: slot.id }
    });
    
    await prisma.instructorSchedule.deleteMany({
      where: { timeSlotId: slot.id }
    });
    
    cleaned++;
  }
  
  console.log(`✅ ${cleaned} TimeSlots fantasma limpiados`);
  console.log('✅ Schedules relacionados eliminados\n');
  console.log('═'.repeat(70));
  console.log('\n🎉 LIMPIEZA COMPLETADA - Recarga el navegador\n');
  
  await prisma.$disconnect();
})();
