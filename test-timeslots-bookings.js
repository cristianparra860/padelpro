const fetch = require('node-fetch');

async function testTimeslots() {
  try {
    const response = await fetch('http://localhost:9002/api/timeslots?clubId=cmftnbe2o0001tgkobtrxipip');
    const slots = await response.json();
    
    console.log('📊 Slots encontrados:', slots.length);
    
    // Buscar slots con bookings
    const slotsWithBookings = slots.filter(s => s.bookings && s.bookings.length > 0);
    console.log('📋 Slots con reservas:', slotsWithBookings.length);
    
    if (slotsWithBookings.length > 0) {
      console.log('\n🎯 Primer slot con reservas:');
      const first = slotsWithBookings[0];
      console.log('  ID:', first.id);
      console.log('  Fecha:', new Date(first.start).toLocaleString('es-ES'));
      console.log('  Bookings:', first.bookings.length);
      console.log('  Primer booking:');
      const booking = first.bookings[0];
      console.log('    - Usuario:', booking.name || booking.userId);
      console.log('    - Foto:', booking.profilePictureUrl ? '✅ ' + booking.profilePictureUrl.substring(0, 50) : '❌ Sin foto');
      console.log('    - GroupSize:', booking.groupSize);
      console.log('    - Status:', booking.status);
    } else {
      console.log('\n⚠️ No hay slots con reservas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTimeslots();