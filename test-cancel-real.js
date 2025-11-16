// Test cancellation endpoint con una reserva real
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9002';

async function testCancellation() {
  try {
    // Tomar una reserva CONFIRMADA (con pista asignada)
    const bookingId = 'booking-1762792657112-hdtc6qraz';
    const userId = 'cmhkwi8so0001tggo0bwojrjy'; // Alex Garcia
    const timeSlotId = 'ts_1762663000591_2v1vqhgck';
    
    console.log('🧪 Probando cancelación de reserva...\n');
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   TimeSlot ID: ${timeSlotId}\n`);
    
    const response = await fetch(`${BASE_URL}/api/classes/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bookingId,
        userId,
        timeSlotId
      })
    });
    
    const status = response.status;
    const data = await response.json();
    
    console.log(`📡 Respuesta del servidor:`);
    console.log(`   Status: ${status}`);
    console.log(`   Data:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Cancelación exitosa!');
      console.log(`   Puntos devueltos: ${data.compensationPoints || 'No especificado'}`);
      console.log(`   Clase liberada: ${data.classFreed ? 'SÍ' : 'NO'}`);
    } else {
      console.log('\n❌ Error en cancelación:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCancellation();
