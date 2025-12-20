const fetch = require('node-fetch');

async function testViaAPI() {
  try {
    console.log('🧪 PRUEBA DE AUTO-CANCELACIÓN VÍA API\n');
    console.log('═'.repeat(60));
    
    const baseURL = 'http://localhost:9002';
    const marcId = 'user-1763677035576-wv1t7iun0';
    
    // PASO 1: Buscar 3 TimeSlots diferentes del día 2025-12-05
    console.log('\n📋 PASO 1: Buscar clases disponibles\n');
    
    const slotsResponse = await fetch(`${baseURL}/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-05`);
    const slotsData = await slotsResponse.json();
    
    if (!slotsData.slots || !Array.isArray(slotsData.slots)) {
      console.log('❌ Formato de respuesta inválido');
      return;
    }
    
    const availableSlots = slotsData.slots.filter(s => !s.courtNumber).slice(0, 3);
    
    if (availableSlots.length < 3) {
      console.log(`❌ Solo hay ${availableSlots.length} clases disponibles`);
      return;
    }
    
    console.log(`✅ ${availableSlots.length} clases disponibles:`);
    availableSlots.forEach((s, i) => {
      const time = new Date(s.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      console.log(`   ${i+1}. ${time} - ${s.bookings.length}/4 inscritos - ${s.id}`);
    });
    
    // PASO 2: Inscribir a Marc en las 3 clases
    console.log('\n📝 PASO 2: Inscribir a Marc en las 3 clases\n');
    
    const marcBookings = [];
    
    for (let i = 0; i < 3; i++) {
      const slot = availableSlots[i];
      const time = new Date(slot.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      
      const response = await fetch(`${baseURL}/api/classes/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: marcId,
          timeSlotId: slot.id,
          groupSize: 1
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Marc inscrito en clase ${time}`);
        marcBookings.push({ slotId: slot.id, time });
      } else {
        console.log(`   ❌ Error en clase ${time}: ${result.error || 'Error desconocido'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (marcBookings.length < 3) {
      console.log('\n❌ No se pudieron crear las 3 inscripciones');
      return;
    }
    
    console.log(`\n   💰 Marc tiene 3 inscripciones PENDING`);
    
    // PASO 3: Completar la primera clase
    console.log('\n🎯 PASO 3: Completar la primera clase\n');
    
    const targetSlot = marcBookings[0];
    console.log(`   🎯 Clase objetivo: ${targetSlot.time}`);
    
    // Obtener usuarios para inscribir
    const anaId = 'ana-user-1764950840275';
    const usersToEnroll = [anaId];
    
    // Inscribir usuarios hasta completar 4
    for (const userId of usersToEnroll) {
      const response = await fetch(`${baseURL}/api/classes/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          timeSlotId: targetSlot.slotId,
          groupSize: 1
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Usuario inscrito`);
      } else {
        console.log(`   ⚠️ ${result.error || 'Error'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Inscribir 2 usuarios más
    for (let i = 0; i < 2; i++) {
      const response = await fetch(`${baseURL}/api/classes/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: anaId,
          timeSlotId: targetSlot.slotId,
          groupSize: 1
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Usuario adicional inscrito (${i+2}/3)`);
      } else {
        console.log(`   ⚠️ ${result.error || 'Error'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n   🎉 Esperando que la clase se confirme automáticamente...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // PASO 4: Verificar resultados
    console.log('\n📊 PASO 4: Verificar resultados\n');
    
    const checkResponse = await fetch(`${baseURL}/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-05`);
    const checkData = await checkResponse.json();
    
    const marcBookingsAfter = [];
    
    for (const slot of checkData.slots) {
      const marcBooking = slot.bookings?.find(b => b.userId === marcId);
      if (marcBooking) {
        const time = new Date(slot.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        const court = slot.courtNumber ? `Pista ${slot.courtNumber}` : 'Sin pista';
        const icon = marcBooking.status === 'CONFIRMED' ? '✅' : marcBooking.status === 'CANCELLED' ? '❌' : '⏳';
        
        marcBookingsAfter.push({
          time,
          status: marcBooking.status,
          court
        });
        
        console.log(`   ${icon} ${time} - ${marcBooking.status} - ${court}`);
      }
    }
    
    const confirmed = marcBookingsAfter.filter(b => b.status === 'CONFIRMED').length;
    const cancelled = marcBookingsAfter.filter(b => b.status === 'CANCELLED').length;
    const pending = marcBookingsAfter.filter(b => b.status === 'PENDING').length;
    
    console.log('\n═'.repeat(60));
    console.log('\n🎯 RESULTADO:\n');
    console.log(`   ✅ CONFIRMED: ${confirmed}`);
    console.log(`   ❌ CANCELLED: ${cancelled}`);
    console.log(`   ⏳ PENDING: ${pending}`);
    
    if (confirmed === 1 && cancelled === 2) {
      console.log('\n   🎉 ¡ÉXITO! Auto-cancelación funcionó correctamente');
    } else if (confirmed === 1 && pending === 2) {
      console.log('\n   ⚠️ Las otras clases aún están PENDING (no se cancelaron)');
    } else {
      console.log('\n   📝 Estado registrado');
    }
    
    console.log('\n═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

testViaAPI();
