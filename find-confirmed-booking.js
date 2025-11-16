const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findConfirmedBooking() {
  try {
    console.log('\n🔍 Buscando reservas confirmadas...\n');
    
    const bookings = await prisma.booking.findMany({
      where: {
        userId: 'cmhkwi8so0001tggo0bwojrjy',
        timeSlot: {
          courtId: { not: null }
        }
      },
      include: {
        timeSlot: {
          include: {
            instructor: true
          }
        }
      },
      take: 5
    });

    if (bookings.length === 0) {
      console.log('❌ No hay reservas confirmadas para este usuario\n');
      return;
    }

    console.log(`✅ Encontradas ${bookings.length} reservas confirmadas:\n`);

    bookings.forEach((booking, index) => {
      const ts = booking.timeSlot;
      console.log(`${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   TimeSlot ID: ${ts.id}`);
      console.log(`   Fecha: ${new Date(ts.start).toLocaleString()}`);
      console.log(`   Pista: ${ts.courtNumber || 'No asignada'}`);
      console.log(`   Precio: ${booking.amountBlocked / 100}€`);
      console.log(`   Puntos a devolver: ${Math.floor(booking.amountBlocked / 100)}`);
      console.log(`   Instructor: ${ts.instructor?.name || 'N/A'}\n`);
    });

    const firstBooking = bookings[0];
    console.log('📝 Para probar la cancelación, usa este Booking ID:');
    console.log(`   ${firstBooking.id}\n`);

    console.log('📋 Comando PowerShell para cancelar:');
    console.log(`Invoke-RestMethod -Uri "http://localhost:9002/api/classes/cancel" -Method POST -ContentType "application/json" -Body '{"bookingId":"${firstBooking.id}","userId":"cmhkwi8so0001tggo0bwojrjy"}'\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findConfirmedBooking();
