const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-09&page=1&limit=50',
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
      const carlosSlot = json.slots.find(slot => 
        slot.instructor && slot.instructor.name === 'Carlos Rodríguez' && 
        slot.start && slot.start.includes('09:00')
      );
      
      if (carlosSlot) {
        console.log('\n=== SLOT DE CARLOS (09:00) ===');
        console.log('ID:', carlosSlot.id);
        console.log('hasRecycledSlots:', carlosSlot.hasRecycledSlots);
        console.log('availableRecycledSlots:', carlosSlot.availableRecycledSlots);
        console.log('recycledSlotsOnlyPoints:', carlosSlot.recycledSlotsOnlyPoints);
        console.log('\n=== BOOKINGS ===');
        if (carlosSlot.bookings && carlosSlot.bookings.length > 0) {
          carlosSlot.bookings.forEach(b => {
            console.log(`  ${b.name} - Status: ${b.status} - isRecycled: ${b.isRecycled} - groupSize: ${b.groupSize}`);
          });
        } else {
          console.log('  (sin bookings)');
        }
        
        // Verificar si el objeto tiene estos campos
        console.log('\n=== VERIFICACIÓN DE CAMPOS EN RESPUESTA API ===');
        console.log('Campos en el slot de Carlos:');
        console.log('  - hasRecycledSlots existe:', 'hasRecycledSlots' in carlosSlot);
        console.log('  - availableRecycledSlots existe:', 'availableRecycledSlots' in carlosSlot);
        console.log('  - recycledSlotsOnlyPoints existe:', 'recycledSlotsOnlyPoints' in carlosSlot);
      } else {
        console.log('❌ No se encontró el slot de Carlos a las 09:00');
      }
    } catch (error) {
      console.error('❌ Error parseando JSON:', error.message);
      console.log('Respuesta raw:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en petición:', error.message);
});

req.end();
