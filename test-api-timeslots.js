const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Fecha del día 24 de noviembre
    const startDate = '2025-11-24T00:00:00.000Z';
    const endDate = '2025-11-24T23:59:59.999Z';
    
    const url = `http://localhost:9002/api/timeslots?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`;
    
    console.log('📡 Llamando al API:', url);
    console.log('');
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Response data type:', typeof data);
    console.log('Is array?:', Array.isArray(data));
    
    if (!response.ok) {
      console.error('❌ Error del API:', data);
      return;
    }
    
    if (!Array.isArray(data)) {
      console.error('❌ El API no devolvió un array:', data);
      return;
    }
    
    console.log(`📊 Total tarjetas devueltas: ${data.length}\n`);
    
    // Filtrar solo las de las 06:00 UTC (7:00 España)
    const slots7AM = data.filter(slot => {
      const start = new Date(slot.start);
      return start.getUTCHours() === 6 && start.getUTCMinutes() === 0;
    });
    
    console.log(`🕐 Tarjetas a las 7:00 (06:00 UTC): ${slots7AM.length}\n`);
    
    // Agrupar por instructor
    const byInstructor = {};
    slots7AM.forEach(slot => {
      const instructor = slot.instructor?.name || 'Sin instructor';
      if (!byInstructor[instructor]) {
        byInstructor[instructor] = [];
      }
      byInstructor[instructor].push(slot);
    });
    
    Object.entries(byInstructor).forEach(([instructor, cards]) => {
      console.log(`👨‍🏫 ${instructor}: ${cards.length} tarjeta(s)`);
      cards.forEach((card, idx) => {
        const bookingsCount = card.bookings?.length || 0;
        console.log(`   ${idx + 1}. ${card.level || 'N/A'} | ${card.genderCategory || 'N/A'} | ${bookingsCount} reservas | ID: ${card.id.substring(0, 12)}...`);
      });
      console.log('');
    });
    
    console.log('════════════════════════════════════════════════');
    console.log(`\n💡 El API devuelve: ${slots7AM.length} tarjetas a las 7:00`);
    console.log(`   Instructores con tarjetas: ${Object.keys(byInstructor).length}`);
    
    const carlosCards = byInstructor['Carlos Martinez'] || [];
    if (carlosCards.length > 1) {
      console.log(`\n✅ Carlos Martinez tiene ${carlosCards.length} tarjetas en el API`);
    } else {
      console.log(`\n❌ Carlos Martinez solo tiene ${carlosCards.length} tarjeta en el API`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Asegúrate de que el servidor está corriendo en el puerto 9002');
  }
}

testAPI();
