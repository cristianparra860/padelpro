// Debug: Ver qué datos devuelve realmente la API
const fetch = require('node-fetch');

async function debugAPI() {
  console.log('🔍 DEBUG: Verificando datos de API\n');
  
  try {
    // Obtener fecha de mañana (10 de noviembre)
    const tomorrow = new Date('2025-11-10');
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`📅 Fecha: ${dateStr}\n`);
    
    const url = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${dateStr}`;
    console.log(`🌐 URL: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Total slots: ${data.length}\n`);
    
    if (data.length > 0) {
      const firstSlot = data[0];
      
      console.log('🔍 PRIMER SLOT COMPLETO:\n');
      console.log('Campos principales:');
      console.log(`  - id: ${firstSlot.id}`);
      console.log(`  - start: ${firstSlot.start}`);
      console.log(`  - instructorName: ${firstSlot.instructorName}`);
      console.log(`  - courtId: ${firstSlot.courtId || 'null (propuesta)'}`);
      
      console.log('\n🏟️ Campos de pistas:');
      console.log(`  - courtsAvailability: ${firstSlot.courtsAvailability ? 'EXISTE' : 'NO EXISTE'}`);
      console.log(`  - availableCourtsCount: ${firstSlot.availableCourtsCount}`);
      
      if (firstSlot.courtsAvailability) {
        console.log('\n  Detalle courtsAvailability:');
        console.log(`    Tipo: ${Array.isArray(firstSlot.courtsAvailability) ? 'Array' : typeof firstSlot.courtsAvailability}`);
        console.log(`    Longitud: ${firstSlot.courtsAvailability.length}`);
        console.log('\n    Contenido:');
        firstSlot.courtsAvailability.forEach((court, i) => {
          console.log(`      ${i + 1}. courtNumber: ${court.courtNumber}, status: ${court.status}, courtId: ${court.courtId}`);
        });
      } else {
        console.log('  ❌ courtsAvailability es undefined o null');
      }
      
      console.log('\n📋 OBJETO COMPLETO (primeros 2 slots):');
      data.slice(0, 2).forEach((slot, i) => {
        console.log(`\n--- Slot ${i + 1} ---`);
        console.log(JSON.stringify(slot, null, 2));
      });
      
    } else {
      console.log('⚠️ No hay slots para mañana');
      console.log('Vamos a verificar si hay slots para cualquier fecha...\n');
      
      // Intentar con fecha de hoy
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const urlToday = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${todayStr}`;
      
      console.log(`Probando con hoy: ${todayStr}`);
      const responseToday = await fetch(urlToday);
      const dataToday = await responseToday.json();
      
      console.log(`Total slots hoy: ${dataToday.length}`);
      
      if (dataToday.length > 0 && dataToday[0].courtsAvailability) {
        console.log('✅ Los datos SÍ incluyen courtsAvailability para hoy');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

debugAPI();
