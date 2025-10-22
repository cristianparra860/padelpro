const fetch = require('node-fetch');

async function testRealBookingAPI() {
  console.log('\n🌐 TEST: API de reservas con bloqueo automático\n');

  const baseUrl = 'http://localhost:9002';
  const userId = 'alex-user-id';

  try {
    // 1. Obtener clases disponibles
    console.log('📋 Obteniendo clases disponibles...');
    const response = await fetch(`${baseUrl}/api/timeslots?date=2025-10-17&level=intermedio&userGender=masculino`);
    const timeSlots = await response.json();

    console.log(`✅ Clases disponibles: ${timeSlots.length}`);

    if (timeSlots.length === 0) {
      console.log('❌ No hay clases disponibles para probar');
      return;
    }

    // Tomar la primera clase disponible
    const timeSlot = timeSlots[0];
    console.log(`\n🎯 Clase seleccionada:`);
    console.log(`   ID: ${timeSlot.id}`);
    console.log(`   Hora: ${new Date(timeSlot.start).toLocaleString('es-ES')}`);
    console.log(`   Nivel: ${timeSlot.level}`);
    console.log(`   Pista: ${timeSlot.courtNumber || 'Sin asignar'}`);
    console.log(`   Reservas actuales: ${timeSlot.bookings.length}`);

    // 2. Hacer una reserva para la opción de 1 jugador
    console.log(`\n📝 Haciendo reserva para opción de 1 jugador...`);
    const bookResponse = await fetch(`${baseUrl}/api/classes/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeSlotId: timeSlot.id,
        userId: userId,
        groupSize: 1
      })
    });

    const bookResult = await bookResponse.json();

    if (bookResult.success) {
      console.log(`✅ Reserva creada exitosamente`);
      console.log(`   Booking ID: ${bookResult.bookingId}`);
      console.log(`   Mensaje: ${bookResult.message}`);
      
      if (bookResult.courtAssigned) {
        console.log(`\n🏆 CLASE COMPLETADA - CARRERA GANADA`);
        console.log(`   Pista asignada: ${bookResult.courtAssigned}`);
        console.log(`   Ganador: Opción de ${bookResult.winningOption} jugador(es)`);

        // 3. Verificar que la clase ya NO aparece en la lista
        console.log(`\n🔍 Verificando que la clase ya no aparece...`);
        const response2 = await fetch(`${baseUrl}/api/timeslots?date=2025-10-17&level=intermedio&userGender=masculino`);
        const timeSlots2 = await response2.json();

        const stillExists = timeSlots2.find(ts => ts.id === timeSlot.id);

        if (!stillExists) {
          console.log(`✅ CONFIRMADO: La clase YA NO aparece en la lista`);
          console.log(`   (Bloqueada correctamente para evitar solapamientos)`);
        } else {
          console.log(`⚠️ ERROR: La clase TODAVÍA aparece en la lista`);
          console.log(`   Pista: ${stillExists.courtNumber}`);
        }
      } else {
        console.log(`\n⏳ Reserva creada pero la clase aún no está completa`);
        console.log(`   Se necesitan más jugadores para completar alguna opción`);
      }

    } else {
      console.log(`❌ Error al crear reserva: ${bookResult.error}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRealBookingAPI();
