const fetch = require('node-fetch');

async function testPagination() {
  console.log('🧪 Probando paginación con día que tiene clases...\n');
  
  // Primero encontrar un día con clases
  const checkDate = '2025-11-08'; // Del script anterior sabemos que este día tiene clases
  
  console.log(`📅 Probando con fecha: ${checkDate}\n`);
  
  // Test 1: Sin paginación (formato antiguo)
  const url1 = `http://localhost:9002/api/timeslots?clubId=club-1&date=${checkDate}&_t=${Date.now()}`;
  console.log('📡 Test 1: SIN paginación');
  
  try {
    const res1 = await fetch(url1);
    const data1 = await res1.json();
    
    // Verificar si es array (formato antiguo) o objeto (formato nuevo)
    if (Array.isArray(data1)) {
      console.log(`✅ Formato antiguo (array): ${data1.length} clases`);
    } else if (data1.slots) {
      console.log(`✅ Formato nuevo: ${data1.slots.length} clases`);
      console.log(`📊 Pagination:`, data1.pagination);
    }
  } catch (error) {
    console.error('❌ Error en test 1:', error.message);
  }
  
  // Test 2: Con paginación - Página 1
  const url2 = `http://localhost:9002/api/timeslots?clubId=club-1&date=${checkDate}&page=1&limit=10&_t=${Date.now()}`;
  console.log('\n📡 Test 2: CON paginación (página 1, limit 10)');
  
  try {
    const res2 = await fetch(url2);
    const data2 = await res2.json();
    
    console.log(`✅ Slots recibidos: ${data2.slots?.length || 0}`);
    console.log(`📊 Pagination:`, data2.pagination);
    
    if (data2.slots && data2.slots.length > 0) {
      console.log('\n📋 Primeras 3 clases:');
      data2.slots.slice(0, 3).forEach((s, i) => {
        const d = new Date(s.start);
        const time = d.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        console.log(`  ${i+1}. ${time} - Court: ${s.courtNumber || 'NULL'}`);
      });
    }
    
    // Test 3: Página 2 si hay más
    if (data2.pagination?.hasMore) {
      console.log('\n📡 Test 3: Página 2');
      const url3 = `http://localhost:9002/api/timeslots?clubId=club-1&date=${checkDate}&page=2&limit=10&_t=${Date.now()}`;
      const res3 = await fetch(url3);
      const data3 = await res3.json();
      
      console.log(`✅ Slots página 2: ${data3.slots?.length || 0}`);
      console.log(`📊 Pagination:`, data3.pagination);
    } else {
      console.log('\n⚠️ No hay página 2 (solo hay', data2.slots?.length, 'clases en total)');
    }
  } catch (error) {
    console.error('❌ Error en test 2/3:', error.message);
  }
}

testPagination();
