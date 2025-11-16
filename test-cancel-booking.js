// Test de cancelación de reserva
const fetch = require('node-fetch');

async function testCancelBooking() {
  try {
    console.log('🧪 Probando cancelación de reserva...\n');
    
    const userId = 'cmhkwi8so0001tggo0bwojrjy'; // Alex Garcia
    
    // Primero, buscar una reserva activa
    const response = await fetch(`http://localhost:9002/api/users/${userId}/bookings`);
    const bookings = await response.json();
    
    console.log(`📋 Reservas activas: ${bookings.length}\n`);
    
    if (bookings.length === 0) {
      console.log('❌ No hay reservas activas para probar cancelación');
      return;
    }
    
    // Buscar una reserva confirmada
    const confirmedBooking = bookings.find(b => b.status === 'CONFIRMED' && b.timeSlot.courtNumber !== null);
    const pendingBooking = bookings.find(b => b.status === 'PENDING');
    
    const testBooking = confirmedBooking || pendingBooking;
    
    if (!testBooking) {
      console.log('❌ No se encontró una reserva para probar');
      return;
    }
    
    console.log('🎯 Reserva seleccionada para prueba:');
    console.log(`   ID: ${testBooking.id}`);
    console.log(`   Status: ${testBooking.status}`);
    console.log(`   TimeSlot: ${testBooking.timeSlotId}`);
    console.log(`   Fecha: ${new Date(testBooking.timeSlot.start).toLocaleString('es-ES')}`);
    console.log(`   Pista: ${testBooking.timeSlot.courtNumber || 'Sin asignar'}`);
    console.log(`   Precio bloqueado: €${(testBooking.amountBlocked / 100).toFixed(2)}\n`);
    
    // Intentar cancelar
    console.log('🔄 Enviando solicitud de cancelación...\n');
    
    const cancelResponse = await fetch('http://localhost:9002/api/classes/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: testBooking.id,
        userId: userId,
        timeSlotId: testBooking.timeSlotId
      })
    });
    
    const result = await cancelResponse.json();
    
    if (cancelResponse.ok) {
      console.log('✅ Cancelación exitosa:');
      console.log(`   Mensaje: ${result.message}`);
      console.log(`   Puntos otorgados: ${result.pointsGranted}`);
      console.log(`   Clase liberada: ${result.classFreed ? 'Sí' : 'No'}`);
      console.log(`   Booking ID: ${result.cancelledBookingId}\n`);
    } else {
      console.log('❌ Error en cancelación:');
      console.log(`   Status: ${cancelResponse.status}`);
      console.log(`   Error: ${result.error}`);
      console.log(`   Detalles: ${result.details || 'N/A'}\n`);
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testCancelBooking();
