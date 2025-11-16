const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingsDetails() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });
    
    console.log('🔍 Verificando detalles de las reservas actuales...\n');
    
    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      include: {
        timeSlot: {
          select: {
            id: true,
            start: true,
            totalPrice: true,
            courtId: true,
            courtNumber: true,
            instructorId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📋 Reservas activas encontradas: ${bookings.length}\n`);
    
    bookings.forEach((b, i) => {
      const slotTime = new Date(Number(b.timeSlot.start));
      console.log(`${i + 1}. Booking ID: ${b.id}`);
      console.log(`   Estado: ${b.status}`);
      console.log(`   Precio: ${b.price}€`);
      console.log(`   Monto bloqueado: ${b.amountBlocked / 100}€`);
      console.log(`   TimeSlot: ${b.timeSlotId}`);
      console.log(`   Clase: ${slotTime.toLocaleString('es-ES')}`);
      console.log(`   CourtId: ${b.timeSlot.courtId || 'NULL'}`);
      console.log(`   CourtNumber: ${b.timeSlot.courtNumber || 'NULL'} ⬅️ ${b.timeSlot.courtNumber ? 'CONFIRMADA' : 'PENDIENTE'}`);
      console.log(`   ⚠️  Cancelar esta reserva ${b.timeSlot.courtNumber ? 'OTORGARÍA' : 'NO OTORGARÍA'} puntos`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingsDetails();
