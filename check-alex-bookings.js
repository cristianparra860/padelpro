const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  try {
    console.log('🔍 Verificando reservas del 19 de octubre...\n');

    // Buscar todas las clases del 19 de octubre
    const timeSlots = await prisma.$queryRaw`
      SELECT id, start, instructorId, courtNumber, level, category
      FROM TimeSlot 
      WHERE start LIKE '2025-10-19%'
      ORDER BY start
      LIMIT 10
    `;

    console.log(`📅 Primeras 10 clases encontradas: ${timeSlots.length}\n`);

    for (const slot of timeSlots) {
      console.log(`\n📍 Clase ID: ${slot.id.substring(0, 20)}...`);
      console.log(`   Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${slot.instructorId.substring(0, 20)}...`);
      console.log(`   Pista asignada: ${slot.courtNumber || 'SIN ASIGNAR'}`);

      // Buscar las reservas para esta clase
      const bookings = await prisma.$queryRaw`
        SELECT 
          b.id, b.userId, b.groupSize, b.status, b.createdAt,
          u.name, u.email
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slot.id}
        AND b.status IN ('PENDING', 'CONFIRMED')
        ORDER BY b.createdAt
      `;

      if (bookings.length > 0) {
        console.log(`   📋 Reservas activas: ${bookings.length}`);
        bookings.forEach((booking, index) => {
          console.log(`\n      Reserva #${index + 1}:`);
          console.log(`      - Usuario: ${booking.name} (${booking.email})`);
          console.log(`      - Modalidad: ${booking.groupSize} jugador${booking.groupSize > 1 ? 'es' : ''}`);
          console.log(`      - Estado: ${booking.status}`);
          console.log(`      - Creada: ${new Date(booking.createdAt).toLocaleString('es-ES')}`);
        });
      } else {
        console.log(`   📋 Reservas activas: 0`);
      }
    }

    // Buscar TODAS las reservas de Alex García
    console.log('\n\n🔍 Buscando TODAS las reservas de Alex García...\n');
    const alexBookings = await prisma.$queryRaw`
      SELECT 
        b.id, b.timeSlotId, b.groupSize, b.status, b.createdAt,
        t.start as classTime
      FROM Booking b
      JOIN TimeSlot t ON b.timeSlotId = t.id
      WHERE b.userId = 'cmge3nlkv0001tg30p0pw8hdm'
      AND b.status IN ('PENDING', 'CONFIRMED')
      ORDER BY t.start
    `;

    console.log(`📋 Total de reservas activas: ${alexBookings.length}\n`);
    alexBookings.forEach((booking, index) => {
      console.log(`Reserva #${index + 1}:`);
      console.log(`  - Clase: ${new Date(booking.classTime).toLocaleString('es-ES')}`);
      console.log(`  - TimeSlot ID: ${booking.timeSlotId.substring(0, 25)}...`);
      console.log(`  - Modalidad: ${booking.groupSize} jugador${booking.groupSize > 1 ? 'es' : ''}`);
      console.log(`  - Estado: ${booking.status}`);
      console.log(`  - Creada: ${new Date(booking.createdAt).toLocaleString('es-ES')}\n`);
    });

    console.log('✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();
