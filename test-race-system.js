const fetch = require('node-fetch');

async function testBooking() {
  console.log('🧪 Probando sistema de reservas con carrera...\n');

  try {
    // 1. Obtener clases disponibles del 18 de octubre
    console.log('1️⃣ Obteniendo clases del 18 de octubre...');
    const slotsResponse = await fetch('http://localhost:9002/api/timeslots?clubId=club-padel-estrella&date=2025-10-18');
    const slots = await slotsResponse.json();
    
    console.log(`   ✅ Encontradas ${slots.length} clases disponibles\n`);

    if (slots.length === 0) {
      console.log('❌ No hay clases disponibles para probar');
      return;
    }

    // Tomar la primera clase
    const testSlot = slots[0];
    console.log('2️⃣ Clase seleccionada para prueba:');
    console.log(`   ID: ${testSlot.id}`);
    console.log(`   Hora: ${new Date(testSlot.start).toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${testSlot.instructorName}`);
    console.log(`   Pista actual: ${testSlot.courtNumber || 'Sin asignar'}`);
    console.log(`   Reservas actuales: ${testSlot.bookedPlayers}\n`);

    // 2. Hacer una reserva de 1 jugador
    console.log('3️⃣ Creando reserva de 1 jugador...');
    const bookingData = {
      userId: 'cmge3nlkv0001tg30p0pw8hdm', // Alex García
      timeSlotId: testSlot.id,
      groupSize: 1
    };

    console.log('   Datos de reserva:', bookingData);

    const bookingResponse = await fetch('http://localhost:9002/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });

    const bookingResult = await bookingResponse.json();
    
    console.log('\n4️⃣ Resultado de la reserva:');
    console.log(JSON.stringify(bookingResult, null, 2));

    if (bookingResult.success) {
      console.log('\n✅ Reserva creada exitosamente!');
      console.log(`   Booking ID: ${bookingResult.bookingId}`);
      console.log(`   Clase completa: ${bookingResult.classComplete ? 'SÍ' : 'NO'}`);
      if (bookingResult.courtAssigned) {
        console.log(`   🎾 Pista asignada: ${bookingResult.courtAssigned}`);
      }
      if (bookingResult.winningOption) {
        console.log(`   🏆 Opción ganadora: ${bookingResult.winningOption} jugador(es)`);
      }
    } else {
      console.log('\n❌ Error al crear reserva:', bookingResult.error);
    }

  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
  }
}

testBooking();
