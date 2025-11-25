const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateBookingConfirmation() {
  console.log('🔍 Simulando lógica de confirmación para una de las reservas pendientes...\n');
  
  // Obtener una de las reservas pendientes de Marc
  const pendingBooking = await prisma.booking.findFirst({
    where: {
      user: {
        email: 'jugador1@padelpro.com'
      },
      status: 'PENDING',
      timeSlot: {
        start: {
          gte: new Date('2025-11-25T00:00:00.000Z')
        }
      }
    },
    include: {
      timeSlot: {
        select: {
          id: true,
          start: true,
          instructor: { select: { name: true } }
        }
      }
    }
  });

  if (!pendingBooking) {
    console.log('❌ No hay reservas pendientes');
    return;
  }

  const timeSlotId = pendingBooking.timeSlotId;
  console.log(`📋 Reserva pendiente encontrada:`);
  console.log(`   Booking ID: ${pendingBooking.id}`);
  console.log(`   TimeSlot ID: ${timeSlotId}`);
  console.log(`   Instructor: ${pendingBooking.timeSlot.instructor.name}`);
  console.log(`   GroupSize: ${pendingBooking.groupSize}`);
  console.log(`\n🏁 Verificando lógica de carrera...\n`);

  // Simular la lógica del código
  const allBookingsForSlot = await prisma.booking.findMany({
    where: {
      timeSlotId: timeSlotId,
      status: { in: ['PENDING', 'CONFIRMED'] }
    }
  });

  console.log(`📊 Total reservas activas para este slot: ${allBookingsForSlot.length}`);

  // Agrupar por groupSize
  const bookingsByGroupSize = {};
  allBookingsForSlot.forEach(booking => {
    const gs = booking.groupSize;
    bookingsByGroupSize[gs] = (bookingsByGroupSize[gs] || 0) + 1;
  });

  console.log('📈 Reservas por groupSize:', bookingsByGroupSize);

  // Verificar si alguna modalidad se completa
  let raceWinner = null;
  for (const [groupSize, count] of Object.entries(bookingsByGroupSize)) {
    const gs = parseInt(groupSize);
    console.log(`\n   🔍 Opción ${gs} jugador(es): ${count}/${gs} reservas`);
    
    if (count >= gs) {
      console.log(`   ✅ ¡GANADOR! La opción de ${gs} jugador(es) está COMPLETA`);
      raceWinner = gs;
      break;
    } else {
      console.log(`   ⏳ No completo aún (necesita ${gs - count} más)`);
    }
  }

  if (raceWinner) {
    console.log(`\n✅ La clase debería confirmarse con groupSize ${raceWinner}`);
    console.log(`   Las reservas de groupSize ${raceWinner} deberían pasar a CONFIRMED`);
    console.log(`   La tarjeta debería clasificarse y crear duplicado ABIERTO`);
  } else {
    console.log(`\n❌ Ninguna modalidad completa - las reservas quedan PENDING`);
  }

  await prisma.$disconnect();
}

simulateBookingConfirmation();
