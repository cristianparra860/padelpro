const fetch = require('node-fetch');

async function checkDays() {
  console.log('📅 Verificando días con clases disponibles...\n');
  
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + i);
    const dateStr = testDate.toISOString().split('T')[0];
    
    const url = `http://localhost:9002/api/timeslots?clubId=club-1&date=${dateStr}&_t=${Date.now()}`;
    const res = await fetch(url);
    
    // Sin paginación primero para ver el total real
    const dataOld = await res.json();
    const total = Array.isArray(dataOld) ? dataOld.length : (dataOld.slots?.length || 0);
    
    console.log(`${dateStr}: ${total} clases`);
  }
}

checkDays().catch(console.error);
