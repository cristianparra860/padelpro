// Obtener booking válido para cancelar
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getValidBooking() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        timeSlot: {
          select: {
            start: true,
            courtNumber: true
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
      console.log('✅ Booking válido encontrado:');
      console.log(`   Booking ID: ${booking.id}`);
      console.log(`   User ID: ${booking.userId}`);
      console.log(`   TimeSlot ID: ${booking.timeSlotId}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Fecha: ${new Date(booking.timeSlot.start).toLocaleString('es-ES')}`);
      console.log(`   Pista: ${booking.timeSlot.courtNumber || 'Sin asignar'}`);
    } else {
      console.log('❌ No hay reservas activas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getValidBooking();
