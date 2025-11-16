// SCRIPT DE DEBUG - Pegar en la consola del navegador (F12)
// Este script verifica si los datos de pistas están llegando

console.log('🔍 DEBUG: Verificando datos de pistas en el navegador\n');

// 1. Hacer una petición manual a la API
const clubId = 'padel-estrella-madrid';
const date = '2025-11-10';
const url = `/api/timeslots?clubId=${clubId}&date=${date}&_t=${Date.now()}`;

console.log(`📡 Haciendo petición a: ${url}\n`);

fetch(url, {
  cache: 'no-store',
  headers: { 'Cache-Control': 'no-cache' }
})
.then(res => {
  console.log(`✅ Status: ${res.status}`);
  return res.json();
})
.then(data => {
  console.log(`📊 Total slots: ${data.length}\n`);
  
  if (data.length === 0) {
    console.error('❌ No hay slots en la respuesta');
    return;
  }
  
  const firstSlot = data[0];
  
  console.log('🔍 PRIMER SLOT:');
  console.log('  ID:', firstSlot.id);
  console.log('  Instructor:', firstSlot.instructorName);
  console.log('  Hora:', new Date(firstSlot.start).toLocaleTimeString('es-ES'));
  
  console.log('\n🏟️ DATOS DE PISTAS:');
  console.log('  courtsAvailability existe?', firstSlot.courtsAvailability ? '✅ SÍ' : '❌ NO');
  
  if (firstSlot.courtsAvailability) {
    console.log('  Tipo:', typeof firstSlot.courtsAvailability);
    console.log('  Es Array?', Array.isArray(firstSlot.courtsAvailability) ? '✅ SÍ' : '❌ NO');
    console.log('  Longitud:', firstSlot.courtsAvailability.length);
    console.log('  availableCourtsCount:', firstSlot.availableCourtsCount);
    
    console.log('\n  Detalle de pistas:');
    firstSlot.courtsAvailability.forEach((court, i) => {
      const emoji = court.status === 'available' ? '🟢' : '🔴';
      console.log(`    ${emoji} Pista ${court.courtNumber}: ${court.status.toUpperCase()}`);
    });
    
    console.log('\n✅ CONCLUSIÓN: Los datos están correctos');
    console.log('💡 Si aún ves "Cargando..." es un problema del componente React');
  } else {
    console.error('❌ courtsAvailability NO está en la respuesta');
    console.log('\n📋 Objeto completo del primer slot:');
    console.log(JSON.stringify(firstSlot, null, 2));
  }
  
  // Verificar todos los slots
  const withCourts = data.filter(s => s.courtsAvailability).length;
  const withoutCourts = data.length - withCourts;
  
  console.log(`\n📊 ESTADÍSTICAS:`);
  console.log(`  Slots CON courtsAvailability: ${withCourts}/${data.length}`);
  console.log(`  Slots SIN courtsAvailability: ${withoutCourts}/${data.length}`);
  
  if (withoutCourts > 0) {
    console.warn(`\n⚠️ HAY ${withoutCourts} SLOTS SIN DATOS DE PISTAS`);
  } else {
    console.log('\n✅ PERFECTO: Todos los slots tienen datos de pistas');
  }
})
.catch(error => {
  console.error('❌ Error en la petición:', error);
});
