const http = require('http');

function testAPI() {
  console.log('\n🔍 VERIFICACIÓN: API /timeslots');
  console.log('=' .repeat(60));
  
  const options = {
    hostname: 'localhost',
    port: 9002,
    path: '/api/timeslots?date=2025-12-15',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const slots = JSON.parse(data);
        
        console.log(`✅ API responde correctamente (${slots.length} slots)`);
        console.log('\n🔍 Buscando clase de María Fernández a las 09:00...');
        
        const mariaClass = slots.find(s => 
          s.instructorName === 'María Fernández' && 
          new Date(Number(s.start)).getHours() === 9
        );
        
        if (mariaClass) {
          console.log('\n✅ Clase encontrada en API:');
          console.log(`   Instructor: ${mariaClass.instructorName}`);
          console.log(`   Hora: ${new Date(Number(mariaClass.start)).toLocaleString()}`);
          console.log(`   Pista: ${mariaClass.courtNumber}`);
          console.log(`   hasRecycledSlots: ${mariaClass.hasRecycledSlots}`);
          console.log(`   availableRecycledSlots: ${mariaClass.availableRecycledSlots}`);
          console.log(`   recycledSlotsOnlyPoints: ${mariaClass.recycledSlotsOnlyPoints}`);
          
          console.log('\n' + '='.repeat(60));
          
          if (mariaClass.hasRecycledSlots && mariaClass.availableRecycledSlots > 0) {
            console.log('\n✅ API devuelve datos correctos para mostrar badge 🎁');
            console.log(`   Badge debe mostrar: "${mariaClass.availableRecycledSlots}p"`);
            console.log('\n🚨 PROBLEMA ESTÁ EN FRONTEND (ClassCardReal.tsx)');
            console.log('   Verificar lógica de rendering del badge');
          } else {
            console.log('\n❌ API NO devuelve datos correctos');
            console.log('   hasRecycledSlots:', mariaClass.hasRecycledSlots);
            console.log('   availableRecycledSlots:', mariaClass.availableRecycledSlots);
            console.log('\n🚨 PROBLEMA ESTÁ EN BACKEND (route.ts)');
            console.log('   Verificar cálculo en /api/timeslots');
          }
        } else {
          console.log('\n❌ No se encontró la clase en la respuesta de la API');
          console.log('\nClases disponibles de María Fernández:');
          slots
            .filter(s => s.instructorName === 'María Fernández')
            .forEach(s => {
              console.log(`   - ${new Date(Number(s.start)).toLocaleString()} | Pista: ${s.courtNumber}`);
            });
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
        
      } catch (error) {
        console.error('❌ Error parseando respuesta:', error.message);
        console.log('Respuesta raw:', data.substring(0, 200));
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error de conexión:', error.message);
    console.log('\n⚠️ Asegúrate de que el servidor está corriendo en puerto 9002');
    console.log('   Ejecuta: npm run dev');
  });
  
  req.end();
}

// Wait longer for server to be ready
setTimeout(testAPI, 10000);
