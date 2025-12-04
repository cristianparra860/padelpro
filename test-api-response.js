// Test API response for timeslots
async function testAPI() {
  const date = '2025-12-04';
  const clubId = 'padel-estrella-madrid';
  
  console.log('\n🔍 Testeando API /api/timeslots...\n');
  console.log(`Fecha: ${date}`);
  console.log(`Club: ${clubId}\n`);
  
  const url = `http://localhost:9002/api/timeslots?clubId=${clubId}&date=${date}&page=1&limit=5&_t=${Date.now()}`;
  console.log(`URL: ${url}\n`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log(`✅ API devolvió ${data.slots.length} clases\n`);
    
    // Mostrar primera clase con detalle
    if (data.slots.length > 0) {
      const firstSlot = data.slots[0];
      console.log('📋 Primera clase (detalle completo):');
      console.log(`   ID: ${firstSlot.id}`);
      console.log(`   Instructor: ${firstSlot.instructorName}`);
      console.log(`   Hora: ${new Date(firstSlot.start).toLocaleTimeString('es-ES')}`);
      console.log(`   Level: ${firstSlot.level}`);
      console.log(`   LevelRange: ${firstSlot.levelRange}`);
      console.log(`   GenderCategory: ${firstSlot.genderCategory}`);
      console.log(`   Bookings array existe: ${Array.isArray(firstSlot.bookings)}`);
      console.log(`   Cantidad de bookings: ${firstSlot.bookings?.length || 0}`);
      
      if (firstSlot.bookings && firstSlot.bookings.length > 0) {
        console.log('\n   📌 Bookings en esta clase:');
        firstSlot.bookings.forEach((b, i) => {
          console.log(`      ${i + 1}. ${b.userName} (${b.userEmail})`);
          console.log(`         - Group Size: ${b.groupSize}`);
          console.log(`         - Status: ${b.status}`);
          console.log(`         - User ID: ${b.userId}`);
        });
      } else {
        console.log('\n   ⚠️ NO HAY BOOKINGS en esta clase');
      }
      
      console.log('\n📦 Objeto completo de la primera clase:');
      console.log(JSON.stringify(firstSlot, null, 2));
    }
    
    // Buscar clase específica de la prueba
    const testSlotId = 'ts-1764308191576-ckdaeugsvsh';
    const testSlot = data.slots.find(s => s.id === testSlotId);
    
    if (testSlot) {
      console.log('\n\n🎯 Encontrada la clase de prueba (David Collado 09:00):');
      console.log(`   ID: ${testSlot.id}`);
      console.log(`   Bookings: ${testSlot.bookings?.length || 0}`);
      if (testSlot.bookings && testSlot.bookings.length > 0) {
        console.log('   Usuarios inscritos:');
        testSlot.bookings.forEach(b => console.log(`      - ${b.userName}`));
      } else {
        console.log('   ⚠️ NO aparece ninguna reserva en el API');
      }
    } else {
      console.log('\n\n❌ NO se encontró la clase de prueba en el API response');
    }
    
  } catch (error) {
    console.error('❌ Error llamando al API:', error.message);
  }
}

testAPI();
