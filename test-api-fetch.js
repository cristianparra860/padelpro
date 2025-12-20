// Test directo al API endpoint usando fetch
const http = require('http');

function fetchAPI() {
  const options = {
    hostname: 'localhost',
    port: 9002,
    path: '/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-09&page=1&limit=50',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('\n🌐 FETCHING API:', `http://localhost:9002${options.path}`);
  console.log('');

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        console.log('📊 RESPONSE STATUS:', res.statusCode);
        console.log('');
        
        if (response.slots) {
          console.log(`✅ Encontrados ${response.slots.length} slots`);
          console.log('');
          
          // Buscar el slot de Carlos a las 09:00
          const carlosSlot = response.slots.find(slot => {
            const slotDate = new Date(slot.start);
            return slot.instructor?.name === 'Carlos Rodríguez' && 
                   slotDate.getHours() === 9 && 
                   slotDate.getMinutes() === 0;
          });
          
          if (carlosSlot) {
            console.log('🎯 SLOT DE CARLOS RODRÍGUEZ 09:00:');
            console.log('ID:', carlosSlot.id);
            console.log('Start:', new Date(carlosSlot.start).toLocaleString('es-ES'));
            console.log('Instructor:', carlosSlot.instructor.name);
            console.log('');
            console.log('🔄 CAMPOS DE RECICLAJE:');
            console.log('  hasRecycledSlots:', carlosSlot.hasRecycledSlots);
            console.log('  availableRecycledSlots:', carlosSlot.availableRecycledSlots);
            console.log('  recycledSlotsOnlyPoints:', carlosSlot.recycledSlotsOnlyPoints);
            console.log('');
            console.log('📋 BOOKINGS:');
            if (carlosSlot.bookings && carlosSlot.bookings.length > 0) {
              carlosSlot.bookings.forEach((booking, i) => {
                console.log(`  ${i + 1}. ${booking.user?.name || 'Usuario desconocido'}`);
                console.log(`     Status: ${booking.status}`);
                console.log(`     isRecycled: ${booking.isRecycled}`);
                console.log(`     groupSize: ${booking.groupSize}`);
                console.log('');
              });
            } else {
              console.log('  (sin bookings)');
            }
            
            // Verificar si debe mostrarse el badge
            const shouldShowBadge = carlosSlot.hasRecycledSlots && 
                                   carlosSlot.availableRecycledSlots > 0;
            console.log('');
            console.log('🎨 BADGE DEBERÍA MOSTRARSE:', shouldShowBadge ? '✅ SÍ' : '❌ NO');
            if (shouldShowBadge) {
              console.log(`   Texto: "♻️ ${carlosSlot.availableRecycledSlots} plaza(s) reciclada(s) - Solo con puntos"`);
            }
          } else {
            console.log('❌ No se encontró el slot de Carlos Rodríguez a las 09:00');
          }
        } else {
          console.log('❌ Response no tiene propiedad "slots"');
          console.log('Response keys:', Object.keys(response));
        }
      } catch (error) {
        console.error('❌ Error parseando JSON:', error.message);
        console.log('Raw data:', data.substring(0, 200));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error en request:', error.message);
  });

  req.end();
}

fetchAPI();
