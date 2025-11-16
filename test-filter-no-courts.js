// Verificar que slots sin pistas disponibles se filtran correctamente
const fetch = require('node-fetch');

async function verifyFiltering() {
  console.log('🔍 VERIFICANDO FILTRADO DE SLOTS SIN PISTAS DISPONIBLES\n');
  
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Hacer petición a la API
    const url = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${dateStr}`;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Total slots devueltos por API: ${data.length}\n`);
    
    // Buscar slots sin pistas disponibles
    const slotsWithNoCourts = data.filter(s => s.availableCourtsCount === 0);
    const slotsWithCourts = data.filter(s => s.availableCourtsCount > 0 || s.courtId !== null);
    
    console.log(`🔴 Slots SIN pistas disponibles: ${slotsWithNoCourts.length}`);
    console.log(`🟢 Slots CON pistas disponibles: ${slotsWithCourts.length}\n`);
    
    if (slotsWithNoCourts.length > 0) {
      console.log('❌ ERROR: Se encontraron slots sin pistas disponibles');
      console.log('⚠️ Estos slots NO DEBERÍAN aparecer en la API:\n');
      
      slotsWithNoCourts.forEach((slot, i) => {
        const start = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const end = new Date(slot.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${i + 1}. ${start}-${end} | ${slot.instructorName} | Pistas: ${slot.availableCourtsCount}`);
      });
      
      console.log('\n❌ FALLO: El filtro no está funcionando correctamente');
    } else {
      console.log('✅ ÉXITO: Todos los slots devueltos tienen pistas disponibles');
      console.log('✅ El filtro está funcionando correctamente\n');
      
      // Mostrar distribución de pistas disponibles
      const distribution = {};
      data.forEach(slot => {
        if (slot.courtId === null) {
          const count = slot.availableCourtsCount;
          distribution[count] = (distribution[count] || 0) + 1;
        }
      });
      
      console.log('📊 Distribución de pistas disponibles (propuestas):');
      Object.keys(distribution).sort().forEach(count => {
        console.log(`   ${count} pistas: ${distribution[count]} slots`);
      });
    }
    
    // Verificar clases confirmadas
    const confirmedSlots = data.filter(s => s.courtId !== null);
    console.log(`\n🎾 Clases confirmadas (siempre se muestran): ${confirmedSlots.length}`);
    
    if (confirmedSlots.length > 0) {
      confirmedSlots.forEach(slot => {
        const start = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const end = new Date(slot.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   🎾 Pista ${slot.courtNumber}: ${start}-${end} | ${slot.instructorName}`);
      });
    }
    
    console.log(`\n✅ Verificación completada\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyFiltering();
