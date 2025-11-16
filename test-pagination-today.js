const fetch = require('node-fetch');

async function testToday() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  console.log('📅 Probando fecha actual:', dateStr);
  console.log('🕐 Hora actual:', today.toLocaleTimeString('es-ES'));
  
  // Primero sin paginación para ver total
  const url1 = `http://localhost:9002/api/timeslots?clubId=club-1&date=${dateStr}&_t=${Date.now()}`;
  console.log('\n📡 Request SIN paginación:', url1);
  
  try {
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    
    // La respuesta ahora es un objeto con slots y pagination
    const total = data1.slots ? data1.slots.length : (Array.isArray(data1) ? data1.length : 0);
    console.log('✅ Total sin paginar:', total);
    
    if (data1.pagination) {
      console.log('📊 Pagination info:', data1.pagination);
    }
    
    // Ahora con paginación
    const url2 = `http://localhost:9002/api/timeslots?clubId=club-1&date=${dateStr}&page=1&limit=10&_t=${Date.now()}`;
    console.log('\n📡 Request CON paginación:', url2);
    
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    
    console.log('✅ Página 1 (limit 10):', data2.slots?.length || 0);
    console.log('📊 Pagination:', data2.pagination);
    
    if (data2.slots && data2.slots.length > 0) {
      console.log('\n📋 Primeras 3 clases:');
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

testToday();
