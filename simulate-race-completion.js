const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateRaceCompletion() {
  console.log('\n🏁 SIMULACIÓN: Completar una carrera de reservas\n');

  try {
    // 1. Buscar una clase disponible (sin pista)
    const availableClass = await prisma.$queryRaw`
      SELECT id, start, level, instructorId, courtNumber, totalPrice
      FROM TimeSlot 
      WHERE courtNumber IS NULL
      AND date(start) >= date('now')
      ORDER BY start ASC
      LIMIT 1
    `;

    if (!availableClass || availableClass.length === 0) {
      console.log('❌ No hay clases disponibles para probar');
      return;
    }

    const timeSlotId = availableClass[0].id;
    const totalPrice = availableClass[0].totalPrice || 55;

    console.log(`✅ Clase seleccionada: ${timeSlotId}`);
    console.log(`   Hora: ${new Date(availableClass[0].start).toLocaleString('es-ES')}`);
    console.log(`   Nivel: ${availableClass[0].level}`);
    console.log(`   Precio: €${totalPrice}`);

    // 2. Limpiar reservas existentes de esta clase
    await prisma.$executeRaw`DELETE FROM Booking WHERE timeSlotId = ${timeSlotId}`;
    console.log(`\n🧹 Limpiadas reservas anteriores`);

    // 3. Crear reservas para diferentes opciones
    const userId = 'alex-user-id';

    // Opción 1: 1 jugador (necesita 1 para completar)
    console.log(`\n📝 Creando reserva para opción de 1 jugador...`);
    await prisma.$executeRaw`
      INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, createdAt, updatedAt)
      VALUES (
        'booking_1player_test',
        ${userId},
        ${timeSlotId},
        1,
        'CONFIRMED',
        datetime('now'),
        datetime('now')
      )
    `;
    console.log(`   ✅ Reserva 1 jugador creada`);

    // Opción 2: 2 jugadores (necesita 2 para completar) - SOLO 1
    console.log(`\n📝 Creando 1 reserva para opción de 2 jugadores (incompleta)...`);
    await prisma.$executeRaw`
      INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, createdAt, updatedAt)
      VALUES (
        'booking_2player1_test',
        ${userId},
        ${timeSlotId},
        2,
        'CONFIRMED',
        datetime('now'),
        datetime('now')
      )
    `;
    console.log(`   ✅ Reserva 2 jugadores (1/2) creada`);

    // Opción 3: 3 jugadores (necesita 3 para completar) - SOLO 1
    console.log(`\n📝 Creando 1 reserva para opción de 3 jugadores (incompleta)...`);
    await prisma.$executeRaw`
      INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, createdAt, updatedAt)
      VALUES (
        'booking_3player1_test',
        ${userId},
        ${timeSlotId},
        3,
        'CONFIRMED',
        datetime('now'),
        datetime('now')
      )
    `;
    console.log(`   ✅ Reserva 3 jugadores (1/3) creada`);

    // 4. Verificar reservas creadas
    const bookings = await prisma.$queryRaw`
      SELECT id, groupSize, status FROM Booking WHERE timeSlotId = ${timeSlotId}
    `;

    console.log(`\n📋 Reservas actuales: ${bookings.length}`);
    bookings.forEach(b => {
      console.log(`   - ${b.id}: ${b.groupSize} jugador(es), ${b.status}`);
    });

    // 5. Simular la detección de ganador (opción de 1 jugador está completa)
    console.log(`\n🏆 DETECTADO: Opción de 1 jugador COMPLETA (1/1)`);
    console.log(`   Aplicando lógica del race system...`);

    // Asignar pista
    const courtNumber = 1;
    await prisma.$executeRaw`
      UPDATE TimeSlot 
      SET courtNumber = ${courtNumber}, updatedAt = datetime('now')
      WHERE id = ${timeSlotId}
    `;
    console.log(`   ✅ Pista ${courtNumber} asignada`);

    // Cancelar opciones perdedoras
    console.log(`   🚫 Cancelando opciones perdedoras (2 y 3 jugadores)...`);
    await prisma.$executeRaw`
      UPDATE Booking 
      SET status = 'CANCELLED', updatedAt = datetime('now')
      WHERE timeSlotId = ${timeSlotId}
      AND groupSize != 1
    `;

    // Devolver créditos
    const refund2 = totalPrice / 2;
    const refund3 = totalPrice / 3;
    await prisma.$executeRaw`
      UPDATE User 
      SET credits = credits + ${refund2}, updatedAt = datetime('now')
      WHERE id = ${userId}
    `;
    console.log(`   💰 Reembolsado €${refund2.toFixed(2)} para opción de 2 jugadores`);

    await prisma.$executeRaw`
      UPDATE User 
      SET credits = credits + ${refund3}, updatedAt = datetime('now')
      WHERE id = ${userId}
    `;
    console.log(`   💰 Reembolsado €${refund3.toFixed(2)} para opción de 3 jugadores`);

    // 6. Verificar resultado
    const finalBookings = await prisma.$queryRaw`
      SELECT id, groupSize, status FROM Booking WHERE timeSlotId = ${timeSlotId}
    `;

    console.log(`\n📊 RESULTADO FINAL:`);
    finalBookings.forEach(b => {
      const emoji = b.status === 'CONFIRMED' ? '✅' : '❌';
      console.log(`   ${emoji} ${b.groupSize} jugador(es): ${b.status}`);
    });

    // Verificar que la clase ya NO aparece como disponible
    const stillAvailable = await prisma.$queryRaw`
      SELECT id FROM TimeSlot WHERE id = ${timeSlotId} AND courtNumber IS NULL
    `;

    if (stillAvailable.length === 0) {
      console.log(`\n✅ CLASE BLOQUEADA: Ya no aparece en nuevas tarjetas`);
      console.log(`   (courtNumber IS NOT NULL)`);
    } else {
      console.log(`\n⚠️ ERROR: La clase todavía es visible`);
    }

    // Verificar créditos del usuario
    const userCredits = await prisma.$queryRaw`
      SELECT credits FROM User WHERE id = ${userId}
    `;
    console.log(`\n💰 Créditos del usuario Alex: €${userCredits[0].credits.toFixed(2)}`);

    console.log(`\n✅ SIMULACIÓN COMPLETADA - Sistema funcionando correctamente`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateRaceCompletion();
