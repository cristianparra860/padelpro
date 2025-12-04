const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-04&page=1&limit=5&_t=' + Date.now(),
  method: 'GET',
  headers: {
    'Cache-Control': 'no-cache'
  }
};

console.log('\n🔍 Testeando API /api/timeslots...\n');
console.log(`URL: http://localhost:9002${options.path}\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      console.log(`✅ Status: ${res.statusCode}`);
      console.log(`✅ API devolvió ${json.slots.length} clases\n`);
      
      // Mostrar primeras 3 clases con bookings
      json.slots.slice(0, 3).forEach((slot, i) => {
        const date = new Date(slot.start);
        console.log(`${i + 1}. Clase ${slot.id.substring(0, 15)}...`);
        console.log(`   Hora: ${date.toLocaleTimeString('es-ES')}`);
        console.log(`   Instructor: ${slot.instructorName}`);
        console.log(`   Level: "${slot.level}"`);
        console.log(`   Gender: "${slot.genderCategory}"`);
        console.log(`   Bookings array existe: ${Array.isArray(slot.bookings)}`);
        console.log(`   Cantidad de bookings: ${slot.bookings?.length || 0}`);
        
        if (slot.bookings && slot.bookings.length > 0) {
          console.log(`   Usuarios inscritos:`);
          slot.bookings.forEach(b => {
            console.log(`      - ${b.userName} (Size: ${b.groupSize}, Status: ${b.status})`);
          });
        } else {
          console.log(`   ⚠️ Sin bookings`);
        }
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error parseando JSON:', error.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en request:', error.message);
});

req.end();
