const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  try {
    console.log('🔍 Verificando reservas del 18 de octubre...\n');

    // Buscar todas las clases del 18 de octubre
    const timeSlots = await prisma.$queryRaw`
      SELECT id, start, instructorId, courtNumber, level, category
      FROM TimeSlot 
      WHERE start LIKE '2025-10-18%'
    `;

    console.log(`📅 Clases encontradas: ${timeSlots.length}\n`);

    for (const slot of timeSlots) {
      console.log(`\n📍 Clase ID: ${slot.id}`);
      console.log(`   Hora: ${slot.start}`);
      console.log(`   Instructor: ${slot.instructorId}`);
      console.log(`   Pista asignada: ${slot.courtNumber || 'SIN ASIGNAR'}`);
      console.log(`   Nivel: ${slot.level || 'N/A'}`);
      console.log(`   Categoría: ${slot.category || 'N/A'}`);

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

      console.log(`   📋 Reservas activas: ${bookings.length}`);

      if (bookings.length > 0) {
        bookings.forEach((booking, index) => {
          console.log(`\n      Reserva #${index + 1}:`);
          console.log(`      - ID: ${booking.id}`);
          console.log(`      - Usuario: ${booking.name} (${booking.email})`);
          console.log(`      - Modalidad: ${booking.groupSize} jugador${booking.groupSize > 1 ? 'es' : ''}`);
          console.log(`      - Estado: ${booking.status}`);
          console.log(`      - Creada: ${booking.createdAt}`);
        });

        // Analizar si alguna modalidad está completa
        console.log(`\n   🏁 ANÁLISIS DE MODALIDADES:`);
        const byGroupSize = {};
        bookings.forEach(b => {
          if (!byGroupSize[b.groupSize]) {
            byGroupSize[b.groupSize] = 0;
          }
          byGroupSize[b.groupSize]++;
        });

        for (const [groupSize, count] of Object.entries(byGroupSize)) {
          const required = parseInt(groupSize);
          const isComplete = count >= required;
          console.log(`      - Modalidad ${groupSize}: ${count}/${required} ${isComplete ? '✅ COMPLETA' : '❌ Incompleta'}`);
        }
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();
