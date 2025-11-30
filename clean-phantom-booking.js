const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPhantomBooking() {
  try {
    console.log('🔍 Buscando reserva fantasma...\n');

    // 1. Verificar reservas
    const bookings = await prisma.booking.findMany();
    console.log(`📊 Reservas en Booking: ${bookings.length}`);
    if (bookings.length > 0) {
      bookings.forEach(b => {
        console.log(`   - ID: ${b.id}, User: ${b.userId}, TimeSlot: ${b.timeSlotId}, Status: ${b.status}`);
      });
    }

    // 2. Buscar TimeSlots con courtId asignado (clases confirmadas)
    const confirmedSlots = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
      }
    });
    console.log(`\n🏟️ TimeSlots confirmados (con courtId): ${confirmedSlots.length}`);
    if (confirmedSlots.length > 0) {
      confirmedSlots.forEach(slot => {
        const date = new Date(Number(slot.start));
        console.log(`   - ID: ${slot.id}, Court: ${slot.courtId}, Fecha: ${date.toLocaleString()}`);
      });
    }

    // 3. Resetear TODOS los courtId a NULL
    if (confirmedSlots.length > 0) {
      console.log('\n🔄 Reseteando todos los TimeSlots a propuestas (courtId = NULL)...');
      const resetResult = await prisma.timeSlot.updateMany({
        where: {
          courtId: { not: null }
        },
        data: {
          courtId: null
        }
      });
      console.log(`   ✅ ${resetResult.count} TimeSlots reseteados`);
    }

    // 4. Eliminar reservas si quedan
    if (bookings.length > 0) {
      console.log('\n🗑️ Eliminando reservas restantes...');
      const deleteResult = await prisma.booking.deleteMany({});
      console.log(`   ✅ ${deleteResult.count} reservas eliminadas`);
    }

    // 5. Verificación final
    console.log('\n✅ VERIFICACIÓN FINAL:');
    const finalBookings = await prisma.booking.count();
    const finalConfirmed = await prisma.timeSlot.count({
      where: { courtId: { not: null } }
    });
    console.log(`   📊 Reservas: ${finalBookings}`);
    console.log(`   🏟️ Clases confirmadas: ${finalConfirmed}`);

    if (finalBookings === 0 && finalConfirmed === 0) {
      console.log('\n✅ ¡LIMPIEZA COMPLETA! No quedan reservas ni clases confirmadas.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

cleanPhantomBooking();
