const fetch = require('node-fetch');

async function testBookingsData() {
  try {
    console.log('🔍 Probando API de timeslots...\n');
    
    const response = await fetch('http://localhost:9002/api/timeslots?clubId=cmftnbe2o0001tgkobtrxipip');
    const slots = await response.json();
    
    console.log('📊 Total slots:', slots.length);
    
    // Buscar un slot con bookings
    const slotWithBookings = slots.find(s => s.bookings && s.bookings.length > 0);
    
    if (slotWithBookings) {
      console.log('\n✅ Slot con bookings encontrado:');
      console.log('  ID:', slotWithBookings.id);
      console.log('  Fecha:', new Date(slotWithBookings.start).toLocaleString('es-ES'));
      console.log('  Total bookings:', slotWithBookings.bookings.length);
      console.log('\n📋 Primer booking:');
      const booking = slotWithBookings.bookings[0];
      console.log('  - ID:', booking.id);
      console.log('  - Usuario:', booking.name || booking.userName);
      console.log('  - UserId:', booking.userId);
      console.log('  - GroupSize:', booking.groupSize);
      console.log('  - Status:', booking.status);
      console.log('  - profilePictureUrl:', booking.profilePictureUrl);
      console.log('  - Tipo de profilePictureUrl:', typeof booking.profilePictureUrl);
      
      console.log('\n🔍 Objeto completo del booking:');
      console.log(JSON.stringify(booking, null, 2));
    } else {
      console.log('\n❌ No se encontraron slots con bookings');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBookingsData();