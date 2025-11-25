const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Primero obtener el clubId
    const clubsResponse = await fetch('http://localhost:9002/api/clubs');
    const clubs = await clubsResponse.json();
    const club = clubs.find(c => c.name.includes('Estrella')) || clubs[0];
    
    console.log('🏢 Club:', club?.name, '| ID:', club?.id);
    console.log('');
    
    const url = `http://localhost:9002/api/timeslots?date=2025-11-24&clubId=${club.id}`;
    
    console.log('📡 Llamando:', url);
    console.log('');
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 Total slots:', data.slots?.length || 0);
    
    if (!data.slots || data.slots.length === 0) {
      console.log('❌ El API no devuelve tarjetas del día 24');
      return;
    }
    
    // Filtrar solo las de las 06:00 UTC (7:00 España)
    const slots7AM = data.slots.filter(s => {
      const start = new Date(s.start);
      return start.getUTCHours() === 6 && start.getUTCMinutes() === 0;
    });
    
    console.log('🕐 Slots a las 7:00:', slots7AM.length);
    console.log('');
    
    // Agrupar por instructor
    const byInstructor = {};
    slots7AM.forEach(s => {
      const name = s.instructorName || 'Sin nombre';
      if (!byInstructor[name]) {
        byInstructor[name] = [];
      }
      byInstructor[name].push(s);
    });
    
    Object.entries(byInstructor).forEach(([instructor, cards]) => {
      console.log(`👨‍🏫 ${instructor}: ${cards.length} tarjeta(s)`);
      cards.forEach((c, idx) => {
        console.log(`   ${idx + 1}. ${c.level} | ${c.genderCategory} | ${c.bookings?.length || 0} reservas | ID: ${c.id.substring(0,12)}...`);
      });
      console.log('');
    });
    
    const carlosCards = byInstructor['Carlos Martinez'] || [];
    console.log('════════════════════════════════════════════════');
    if (carlosCards.length > 1) {
      console.log(`✅ API devuelve ${carlosCards.length} tarjetas de Carlos Martinez`);
    } else {
      console.log(`❌ API solo devuelve ${carlosCards.length} tarjeta de Carlos Martinez`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
