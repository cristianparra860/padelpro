const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkViolations() {
  console.log('🔍 Verificando violaciones de reglas...\n');

  // Verificar reservas CONFIRMED del usuario Cristian Parra
  const confirmedBookings = await prisma.$queryRaw`
    SELECT b.id, b.userId, b.status, ts.start, ts.courtNumber, ts.id as timeSlotId
    FROM Booking b
    JOIN TimeSlot ts ON b.timeSlotId = ts.id
    WHERE b.userId = 'user-cristian-parra'
    AND b.status = 'CONFIRMED'
    ORDER BY ts.start
  `;

  console.log('📊 Reservas CONFIRMED de Cristian Parra:', confirmedBookings.length);
  for (const booking of confirmedBookings) {
    const date = new Date(Number(booking.start));
    console.log(`  - ${booking.id}: ${date.toISOString()} (Pista ${booking.courtNumber})`);
  }

  // Agrupar por día
  const bookingsByDay = {};
  for (const booking of confirmedBookings) {
    const date = new Date(Number(booking.start));
    const dayKey = date.toISOString().split('T')[0];
    if (!bookingsByDay[dayKey]) {
      bookingsByDay[dayKey] = [];
    }
    bookingsByDay[dayKey].push(booking);
  }

  console.log('\n📅 Reservas por día:');
  for (const [day, bookings] of Object.entries(bookingsByDay)) {
    console.log(`  ${day}: ${bookings.length} reservas`);
    if (bookings.length > 1) {
      console.log(`    ❌ VIOLACIÓN: Más de una reserva confirmada en el mismo día`);
    }
  }

  // Verificar solapamientos
  const overlaps = [];
  for (let i = 0; i < confirmedBookings.length; i++) {
    for (let j = i + 1; j < confirmedBookings.length; j++) {
      const b1 = confirmedBookings[i];
      const b2 = confirmedBookings[j];
      
      if (b1.courtNumber === b2.courtNumber) {
        const start1 = Number(b1.start);
        const start2 = Number(b2.start);
        
        // Asumiendo 60 minutos de duración
        const end1 = start1 + (60 * 60 * 1000);
        const end2 = start2 + (60 * 60 * 1000);
        
        if (start1 < end2 && start2 < end1) {
          overlaps.push({ b1, b2 });
        }
      }
    }
  }

  console.log(`\n🏟️ Solapamientos encontrados: ${overlaps.length}`);
  for (const { b1, b2 } of overlaps) {
    const date1 = new Date(Number(b1.start));
    const date2 = new Date(Number(b2.start));
    console.log(`  ❌ Pista ${b1.courtNumber}: ${date1.toISOString()} vs ${date2.toISOString()}`);
  }

  await prisma.$disconnect();
}

checkViolations().catch(console.error);
