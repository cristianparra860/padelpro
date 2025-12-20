// Verificar respuesta API para 9 de diciembre
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/timeslots?date=2025-12-09&clubId=club-1763677035441-jn59bhq2z&userId=user-1763677035576-wv1t7iun0&levels=principiante,intermedio,avanzado,1.0,2.0,3.0,4.0,5.0,5-7,6.0,7.0,abierto&genders=masculino,femenino,mixto',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n📊 RESPUESTA API PARA 9 DICIEMBRE:');
      console.log('Total slots:', json.timeSlots?.length || 0);
      
      // Buscar la clase de Carlos Martinez a las 9:00
      const carlosClass = json.timeSlots?.find(slot => 
        slot.instructorName === 'Carlos Martinez' && 
        slot.start.includes('T09:00:00')
      );
      
      if (carlosClass) {
        console.log('\n✅ CLASE ENCONTRADA: Carlos Martinez 9:00');
        console.log('ID:', carlosClass.id);
        console.log('hasRecycledSlots:', carlosClass.hasRecycledSlots);
        console.log('availableRecycledSlots:', carlosClass.availableRecycledSlots);
        console.log('recycledSlotsOnlyPoints:', carlosClass.recycledSlotsOnlyPoints);
        console.log('courtNumber:', carlosClass.courtNumber);
        console.log('availableSlots:', carlosClass.availableSlots);
        
        console.log('\n🎯 BADGE DEBERÍA MOSTRARSE:', 
          carlosClass.hasRecycledSlots && carlosClass.availableRecycledSlots > 0 ? '✅ SÍ' : '❌ NO'
        );
      } else {
        console.log('\n❌ NO SE ENCONTRÓ la clase de Carlos Martinez a las 9:00');
        console.log('\n📋 Clases disponibles:');
        json.timeSlots?.slice(0, 5).forEach(slot => {
          console.log(`  - ${slot.instructorName} ${new Date(slot.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
        });
      }
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
});

req.end();
