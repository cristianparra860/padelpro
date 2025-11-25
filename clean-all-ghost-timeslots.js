const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🧹 LIMPIEZA COMPLETA DE TODOS LOS TIMESLOTS FANTASMA\n');
  console.log('='.repeat(70));
  
  // Buscar TODOS los TimeSlots que tienen pista asignada pero sin reservas
  console.log('\n1️⃣ Buscando TimeSlots con pista asignada pero sin reservas...\n');
  
  const ghostSlots = await prisma.timeSlot.findMany({
    where: {
      courtNumber: { not: null }
    },
    include: {
      bookings: true
    }
  });
  
  console.log(`Total TimeSlots con pista asignada: ${ghostSlots.length}\n`);
  
  let cleaned = 0;
  
  for (const slot of ghostSlots) {
    // Filtrar solo bookings activos (no CANCELLED)
    const activeBookings = slot.bookings.filter(b => b.status !== 'CANCELLED');
    
    if (activeBookings.length === 0) {
      const fecha = new Date(slot.start).toLocaleString('es-ES');
      console.log(`🧹 Limpiando: ${fecha} - Pista ${slot.courtNumber}`);
      console.log(`   ID: ${slot.id}`);
      console.log(`   Bookings totales: ${slot.bookings.length}`);
      console.log(`   Bookings activos: ${activeBookings.length}`);
      
      // Quitar pista asignada
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: { courtNumber: null }
      });
      
      // Limpiar CourtSchedule
      await prisma.courtSchedule.deleteMany({
        where: { timeSlotId: slot.id }
      });
      
      // Limpiar InstructorSchedule
      await prisma.instructorSchedule.deleteMany({
        where: { timeSlotId: slot.id }
      });
      
      console.log('   ✅ Limpiado\n');
      cleaned++;
    }
  }
  
  console.log('='.repeat(70));
  console.log(`\n✅ LIMPIEZA COMPLETADA: ${cleaned} TimeSlots limpiados\n`);
  
  if (cleaned > 0) {
    console.log('🔄 Ahora recarga la página en el navegador (F5)\n');
  } else {
    console.log('✅ No se encontraron TimeSlots fantasma\n');
  }
  
  await prisma.$disconnect();
})();
