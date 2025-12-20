const http = require('http');

// Esperar 1 segundo para que el servidor esté listo
setTimeout(() => {
  const options = {
    hostname: 'localhost',
    port: 9002,
    path: '/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-09&page=1&limit=50',
    method: 'GET'
  };

  console.log('\n🌐 Consultando API...\n');

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (!response.slots) {
          console.log('❌ No hay slots en la respuesta');
          return;
        }

        const carlosSlot = response.slots.find(slot => {
          const date = new Date(slot.start);
          return slot.instructor?.name === 'Carlos Rodríguez' && 
                 date.getHours() === 9 && 
                 date.getMinutes() === 0;
        });

        if (!carlosSlot) {
          console.log('❌ No se encontró el slot de Carlos a las 09:00');
          return;
        }

        console.log('🎯 SLOT DE CARLOS 09:00:\n');
        console.log('ID:', carlosSlot.id);
        console.log('Start:', new Date(carlosSlot.start).toLocaleString('es-ES'));
        console.log('Instructor:', carlosSlot.instructor.name);
        console.log('\n🔄 CAMPOS RECICLAJE:');
        console.log('  hasRecycledSlots:', carlosSlot.hasRecycledSlots);
        console.log('  availableRecycledSlots:', carlosSlot.availableRecycledSlots);
        console.log('  recycledSlotsOnlyPoints:', carlosSlot.recycledSlotsOnlyPoints);
        console.log('\n📋 BOOKINGS (' + (carlosSlot.bookings?.length || 0) + '):');
        
        if (carlosSlot.bookings && carlosSlot.bookings.length > 0) {
          carlosSlot.bookings.forEach((booking, i) => {
            console.log(`  ${i + 1}. ${booking.user?.name || 'Desconocido'}`);
            console.log(`     Status: ${booking.status}`);
            console.log(`     isRecycled: ${booking.isRecycled}`);
            console.log(`     groupSize: ${booking.groupSize}`);
            console.log('');
          });
        } else {
          console.log('  (sin bookings)');
        }

        const shouldShowBadge = carlosSlot.hasRecycledSlots && carlosSlot.availableRecycledSlots > 0;
        console.log('🎨 BADGE DEBE MOSTRARSE:', shouldShowBadge ? '✅ SÍ' : '❌ NO');
        
        if (shouldShowBadge) {
          console.log(`   Texto: "♻️ ${carlosSlot.availableRecycledSlots} plaza(s) reciclada(s) - Solo con puntos"`);
        }

      } catch (error) {
        console.error('❌ Error parseando respuesta:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error en petición:', error.message);
    console.log('\n⏳ El servidor aún no está listo. Espera unos segundos más.');
  });

  req.end();
}, 3000);
