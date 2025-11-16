const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== LIMPIEZA DE TIMESLOTS SIN BOOKINGS ===\n');
  
  // Buscar TODOS los TimeSlots con courtId pero sin bookings activos
  const slotsConCourtSinBookings = await prisma.timeSlot.findMany({
    where: {
      courtId: {
        not: null
      }
    },
    include: {
      bookings: {
        where: {
          status: {
            not: 'CANCELLED'
          }
        }
      }
    }
  });
  
  console.log(`Total TimeSlots con courtId: ${slotsConCourtSinBookings.length}`);
  
  const sinBookings = slotsConCourtSinBookings.filter(s => s.bookings.length === 0);
  
  console.log(`TimeSlots SIN bookings activos: ${sinBookings.length}\n`);
  
  if (sinBookings.length === 0) {
    console.log('✅ No hay TimeSlots que necesiten limpieza');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Limpiando TimeSlots...\n');
  
  for (const slot of sinBookings) {
    console.log(`🧹 Limpiando TimeSlot ${slot.id}:`);
    console.log(`   Fecha: ${new Date(slot.start).toLocaleString('es-ES')}`);
    console.log(`   Pista actual: ${slot.courtNumber}`);
    
    // Limpiar courtId y courtNumber
    await prisma.timeSlot.update({
      where: { id: slot.id },
      data: {
        courtId: null,
        courtNumber: null,
        genderCategory: null
      }
    });
    
    // Limpiar CourtSchedule
    await prisma.courtSchedule.deleteMany({
      where: { timeSlotId: slot.id }
    });
    
    // Limpiar InstructorSchedule
    await prisma.instructorSchedule.deleteMany({
      where: { timeSlotId: slot.id }
    });
    
    console.log(`   ✅ Limpiado correctamente\n`);
  }
  
  console.log(`\n✅ PROCESO COMPLETADO: ${sinBookings.length} TimeSlots limpiados`);
  console.log('El calendario ahora mostrará estos slots como propuestas (naranja) en lugar de confirmados (verde)');
  
  await prisma.$disconnect();
}

main();
