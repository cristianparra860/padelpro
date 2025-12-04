// Test script para activar una plaza con puntos aleatoriamente

async function testCreditsSlots() {
  try {
    // 1. Obtener todas las clases
    console.log('📊 Obteniendo clases disponibles...\n');
    const response = await fetch('http://localhost:9002/api/timeslots');
    const data = await response.json();
    
    // El API devuelve 'slots' no 'timeSlots'
    const allSlots = data.slots || data.timeSlots || [];
    
    // Filtrar clases futuras sin reservas (para poder activar puntos)
    const futureSlots = allSlots.filter(slot => {
      const isFuture = new Date(slot.start) > new Date();
      const hasNoBookings = !slot.currentBookings || slot.currentBookings === 0;
      return isFuture && hasNoBookings;
    });
    
    console.log(`✅ Clases futuras encontradas: ${futureSlots.length}\n`);
    
    if (futureSlots.length === 0) {
      console.log('❌ No hay clases futuras disponibles');
      return;
    }
    
    // Elegir una clase aleatoria
    const randomSlot = futureSlots[Math.floor(Math.random() * futureSlots.length)];
    
    console.log('🎯 Clase seleccionada aleatoriamente:');
    console.log('   ID:', randomSlot.id);
    console.log('   Fecha:', new Date(randomSlot.start).toLocaleString('es-ES'));
    console.log('   Instructor:', randomSlot.instructorName);
    console.log('   Credits slots actuales:', randomSlot.creditsSlots || '[]');
    console.log('');
    
    // Elegir modalidad aleatoria (1, 2, 3, o 4 jugadores)
    const modalities = [1, 2, 3, 4];
    const randomModality = modalities[Math.floor(Math.random() * modalities.length)];
    
    console.log(`🎲 Modalidad elegida: ${randomModality} jugador${randomModality > 1 ? 'es' : ''}\n`);
    
    // 2. Activar la plaza con puntos
    console.log('🔄 Activando plaza con puntos...\n');
    const updateResponse = await fetch(`http://localhost:9002/api/timeslots/${randomSlot.id}/credits-slots`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        slotIndex: randomModality, 
        action: 'add',
        creditsCost: 50
      })
    });
    
    const updateResult = await updateResponse.json();
    
    if (updateResponse.ok) {
      console.log('✅ ¡Plaza activada exitosamente!');
      console.log('   Mensaje:', updateResult.message);
      console.log('   Credits slots:', updateResult.creditsSlots);
      console.log('   Coste:', updateResult.creditsCost, 'puntos');
      console.log('');
      console.log('🎉 Resultado:');
      console.log(`   - Clase: ${new Date(randomSlot.start).toLocaleString('es-ES')}`);
      console.log(`   - Modalidad activada: ${randomModality} jugador${randomModality > 1 ? 'es' : ''}`);
      console.log('   - Los alumnos verán esta plaza en dorado con icono 🎁');
    } else {
      console.log('❌ Error al activar plaza:', updateResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

testCreditsSlots();
