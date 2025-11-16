const fetch = require('node-fetch');

async function testPagination() {
  console.log('🧪 Probando API de paginación...\n');
  
  const url = `http://localhost:9002/api/timeslots?clubId=club-1&date=2025-11-16&page=1&limit=10&_t=${Date.now()}`;
  console.log('📡 URL:', url);
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('\n📊 Respuesta de la API:');
  console.log('- Total slots:', data.slots?.length || 0);
  console.log('- Pagination:', data.pagination);
  
  if (data.slots && data.slots.length > 0) {
    console.log('\n📋 Clases recibidas:');
    data.slots.forEach((s, i) => {
      const d = new Date(s.start);
      const time = d.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      const hour = d.getHours();
      console.log(`${i+1}. ${time} (${hour}h) - Court: ${s.courtNumber || 'NULL'}`);
    });
  }
}

testPagination().catch(console.error);
