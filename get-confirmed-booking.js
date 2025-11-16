// Obtener booking CONFIRMADO para cancelar
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getConfirmedBooking() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED' // Solo confirmadas
      },
      include: {
        timeSlot: {
          select: {
            start: true,
            courtNumber: true,
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1
    });
    
    if (bookings.length > 0) {
      const booking = bookings[0];
      console.log('✅ Booking CONFIRMADO encontrado:');
      console.log(`   Booking ID: ${booking.id}`);
      console.log(`   User ID: ${booking.userId}`);
      console.log(`   TimeSlot ID: ${booking.timeSlotId}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Fecha: ${new Date(booking.timeSlot.start).toLocaleString('es-ES')}`);
      console.log(`   Pista: ${booking.timeSlot.courtNumber}`);
      console.log(`   Monto bloqueado: €${(booking.amountBlocked/100).toFixed(2)}`);
    } else {
      console.log('❌ No hay reservas confirmadas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getConfirmedBooking();
