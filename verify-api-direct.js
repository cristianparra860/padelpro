const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-28&userId=user-test&userLevel=5.0&userGender=masculino&page=1&limit=50',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const carlosSlot = json.slots.find(s => s.instructorName === 'Carlos Martinez' && s.start.includes('08:00'));
      
      if (carlosSlot) {
        console.log('\n=== ✅ SLOT CARLOS MARTINEZ 09:00 (08:00 UTC) ===');
        console.log('hasRecycledSlots:', carlosSlot.hasRecycledSlots);
        console.log('availableRecycledSlots:', carlosSlot.availableRecycledSlots);
        console.log('recycledSlotsOnlyPoints:', carlosSlot.recycledSlotsOnlyPoints);
        console.log('\n📋 Bookings:');
        carlosSlot.bookings.forEach(b => {
          console.log(`  - ${b.userName}: status=${b.status}, isRecycled=${b.isRecycled}, groupSize=${b.groupSize}`);
        });
        
        if (carlosSlot.hasRecycledSlots && carlosSlot.availableRecycledSlots === 2) {
          console.log('\n✅ API DEVUELVE DATOS CORRECTOS - Los círculos 1 y 2 deberían ser AMARILLOS');
        } else {
          console.log('\n❌ ERROR: API no devuelve datos de reciclaje correctos');
        }
      } else {
        console.log('❌ No se encontró slot de Carlos Martinez a las 09:00');
      }
    } catch (e) {
      console.error('Error parsing JSON:', e);
      console.log('Raw data:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();
