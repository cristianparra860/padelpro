const fetch = require('node-fetch');

async function testWithCorrectClub() {
  const dateStr = '2025-11-08'; // Primer día con clases según la BD
  
  console.log('🧪 Probando API con club correcto...\n');
  
  // Test 1: Sin paginación
  const url1 = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${dateStr}&_t=${Date.now()}`;
  console.log('📡 Request SIN paginación:');
  console.log(url1);
  
  try {
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    
    const total = Array.isArray(data1) ? data1.length : (data1.slots?.length || 0);
    console.log('\n✅ Total slots:', total);
    
    // Test 2: CON paginación (página 1, 10 items)
    const url2 = `http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=${dateStr}&page=1&limit=10&_t=${Date.now()}`;
    console.log('\n📡 Request CON paginación (page=1, limit=10):');
    console.log(url2);
    
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    
    console.log('\n✅ Página 1:', data2.slots?.length || 0, 'slots');
    console.log('📊 Pagination:', data2.pagination);
    
    if (data2.slots && data2.slots.length > 0) {
      console.log('\n📋 Primeras 3 clases de la página 1:');
      data2.slots.slice(0, 3).forEach((s, i) => {
        const d = new Date(s.start);
        const time = d.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        console.log(`${i+1}. ${time} - Court: ${s.courtNumber || 'NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWithCorrectClub();
