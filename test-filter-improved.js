// Test mejorado: verificar filtro correctamente
const fetch = require('node-fetch');

async function testImproved() {
  console.log('🔍 TEST MEJORADO: Verificar filtro de pistas\n');
  
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const url = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${dateStr}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Separar propuestas de confirmadas
    const proposals = data.filter(s => s.courtId === null);
    const confirmed = data.filter(s => s.courtId !== null);
    
    console.log(`📊 Total slots: ${data.length}`);
    console.log(`   - Propuestas (sin pista): ${proposals.length}`);
    console.log(`   - Confirmadas (con pista): ${confirmed.length}\n`);
    
    // Verificar propuestas sin pistas disponibles
    const proposalsNoCourts = proposals.filter(s => s.availableCourtsCount === 0);
    const proposalsWithCourts = proposals.filter(s => s.availableCourtsCount > 0);
    
    console.log(`🔍 PROPUESTAS (las que importan para el filtro):`);
    console.log(`   ✅ Con pistas disponibles: ${proposalsWithCourts.length}`);
    console.log(`   ❌ Sin pistas disponibles: ${proposalsNoCourts.length}\n`);
    
    if (proposalsNoCourts.length > 0) {
      console.log('❌ ERROR: Hay propuestas sin pistas que NO deberían mostrarse:\n');
      proposalsNoCourts.forEach((slot, i) => {
        const start = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const end = new Date(slot.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${i + 1}. ${start}-${end} | ${slot.instructorName}`);
        console.log(`      Estado pistas:`, slot.courtsAvailability.map(c => `Pista ${c.courtNumber}: ${c.status}`).join(', '));
      });
      console.log('\n❌ FALLO: El filtro de propuestas no funciona\n');
    } else {
      console.log('✅ ÉXITO: Todas las propuestas tienen pistas disponibles');
      console.log('✅ El filtro está funcionando correctamente\n');
      
      // Distribución
      const dist = {};
      proposals.forEach(s => {
        const count = s.availableCourtsCount;
        dist[count] = (dist[count] || 0) + 1;
      });
      
      console.log('📊 Distribución de pistas disponibles (propuestas):');
      Object.keys(dist).sort((a, b) => Number(b) - Number(a)).forEach(count => {
        const bar = '█'.repeat(Math.ceil(dist[count] / 5));
        console.log(`   ${count} pistas: ${dist[count].toString().padStart(3)} ${bar}`);
      });
    }
    
    // Info sobre confirmadas
    console.log(`\n🎾 CLASES CONFIRMADAS (siempre se muestran): ${confirmed.length}`);
    if (confirmed.length > 0) {
      confirmed.forEach(slot => {
        const start = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const end = new Date(slot.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   🎾 Pista ${slot.courtNumber}: ${start}-${end} | ${slot.instructorName}`);
        console.log(`      Disponibles otras: ${slot.availableCourtsCount}/4 pistas`);
      });
    }
    
    console.log(`\n✅ Verificación completada\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testImproved();
