const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRecycledBooking() {
  try {
    // Buscar booking cancelado
    const cancelledBookings = await prisma.booking.findMany({
      where: {
        timeSlotId: 'ts-1764308197680-dpjdjcrk1ah',
        status: 'CANCELLED'
      }
    });

    console.log(`📋 Encontrados ${cancelledBookings.length} bookings cancelados`);

    if (cancelledBookings.length > 0) {
      for (const booking of cancelledBookings) {
        console.log(`\n🔄 Booking ${booking.id}:`);
        console.log(`   - Status: ${booking.status}`);
        console.log(`   - isRecycled (antes): ${booking.isRecycled}`);
        
        // Actualizar a isRecycled = true
        const updated = await prisma.booking.update({
          where: { id: booking.id },
          data: { isRecycled: true }
        });
        
        console.log(`   - isRecycled (después): ${updated.isRecycled}`);
        console.log(`   ✅ Booking actualizado`);
      }
    } else {
      console.log('❌ No se encontraron bookings cancelados');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateRecycledBooking();
