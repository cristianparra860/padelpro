// Verificar API response para clase con plaza reciclada
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-15',
  method: 'GET'
};

console.log('\n🔍 API TEST: /timeslots?date=2025-12-15\n');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const mariaClass = json.timeSlots?.find(s => 
        s.instructorName?.includes('María') && 
        new Date(s.start).getHours() === 9
      );
      
      if (mariaClass) {
        console.log('✅ Clase de María encontrada:\n');
        console.log(`Pista: ${mariaClass.courtNumber}`);
        console.log(`hasRecycledSlots: ${mariaClass.hasRecycledSlots}`);
        console.log(`availableRecycledSlots: ${mariaClass.availableRecycledSlots}`);
        console.log(`Bookings: ${mariaClass.bookings?.length || 0}\n`);
        
        if (mariaClass.bookings) {
          mariaClass.bookings.forEach(b => {
            console.log(`  - ${b.name}: ${b.status} isRecycled=${b.isRecycled} groupSize=${b.groupSize}`);
          });
        }
        
        console.log('\n🎯 RESULTADO:');
        if (mariaClass.hasRecycledSlots && mariaClass.availableRecycledSlots > 0) {
          console.log(`✅ API CORRECTA - Badge debe mostrarse`);
        } else {
          console.log(`❌ API INCORRECTA - hasRecycledSlots debería ser true`);
        }
      } else {
        console.log('❌ Clase no encontrada');
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.end();
