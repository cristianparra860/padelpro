const http = require('http');

console.log('\n🔍 Haciendo petición a /api/timeslots...\n');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/timeslots?date=2025-12-15',
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
      const mariaClass = json.find(slot => 
        slot.instructorName === 'María Fernández' && 
        slot.start && slot.start.includes('09:00') &&
        slot.courtNumber != null
      );
      
      if (mariaClass) {
        console.log('✅ CLASE DE MARÍA FERNÁNDEZ ENCONTRADA:\n');
        console.log('   instructorName:', mariaClass.instructorName);
        console.log('   courtNumber:', mariaClass.courtNumber);
        console.log('   hasRecycledSlots:', mariaClass.hasRecycledSlots);
        console.log('   availableRecycledSlots:', mariaClass.availableRecycledSlots);
        console.log('   recycledSlotsOnlyPoints:', mariaClass.recycledSlotsOnlyPoints);
        console.log('   bookings:', mariaClass.bookings?.length || 0);
        
        if (mariaClass.bookings) {
          console.log('\n   📋 Detalles de bookings:');
          mariaClass.bookings.forEach(b => {
            console.log(`      - ${b.name}: status=${b.status}, isRecycled=${b.isRecycled}, groupSize=${b.groupSize}`);
          });
        }
        
        console.log('\n🎯 RESULTADO:');
        if (mariaClass.hasRecycledSlots && mariaClass.availableRecycledSlots > 0) {
          console.log('   ✅ Badge DEBE mostrarse (♻️ con puntos)');
        } else {
          console.log('   ❌ Badge NO se mostrará');
          console.log('   Razón:', !mariaClass.hasRecycledSlots ? 'hasRecycledSlots=false' : 'availableRecycledSlots=0');
        }
      } else {
        console.log('❌ No se encontró la clase de María Fernández a las 09:00 con pista asignada');
        console.log(`\n📊 Total de slots recibidos: ${json.length}`);
        
        const mariaSlots = json.filter(s => s.instructorName === 'María Fernández');
        if (mariaSlots.length > 0) {
          console.log(`\n   Clases de María Fernández encontradas: ${mariaSlots.length}`);
          mariaSlots.forEach(s => {
            console.log(`   - ${s.start} | Pista: ${s.courtNumber || 'SIN ASIGNAR'}`);
          });
        }
      }
    } catch (e) {
      console.error('❌ Error parseando respuesta:', e.message);
      console.log('Respuesta recibida:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en la petición:', error.message);
  console.log('\n⚠️  Asegúrate de que el servidor está corriendo en puerto 9002');
});

req.end();
