const fetch = require('node-fetch');

async function testApis() {
  console.log('🧪 Probando APIs del servidor...\n');

  try {
    // Test 1: API de clubs
    console.log('1️⃣ Probando /api/clubs...');
    const clubsResponse = await fetch('http://localhost:9002/api/clubs');
    console.log(`   Status: ${clubsResponse.status}`);
    
    if (clubsResponse.ok) {
      const clubs = await clubsResponse.json();
      console.log(`   ✅ Clubs encontrados: ${clubs.length}`);
      if (clubs.length > 0) {
        console.log(`   Club[0]: ${clubs[0].name} (ID: ${clubs[0].id})`);
      }
    } else {
      const error = await clubsResponse.text();
      console.log(`   ❌ Error: ${error}`);
    }

    console.log('');

    // Test 2: API de timeslots
    console.log('2️⃣ Probando /api/timeslots...');
    const timeslotsUrl = 'http://localhost:9002/api/timeslots?clubId=club-padel-estrella&date=2025-10-17';
    console.log(`   URL: ${timeslotsUrl}`);
    
    const timeslotsResponse = await fetch(timeslotsUrl);
    console.log(`   Status: ${timeslotsResponse.status}`);
    
    if (timeslotsResponse.ok) {
      const slots = await timeslotsResponse.json();
      console.log(`   ✅ Slots encontrados: ${slots.length}`);
      if (slots.length > 0) {
        console.log(`   Slot[0]: ${new Date(slots[0].start).toLocaleString('es-ES')}`);
      }
    } else {
      const error = await timeslotsResponse.text();
      console.log(`   ❌ Error: ${error}`);
    }

  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
  }
}

testApis();
