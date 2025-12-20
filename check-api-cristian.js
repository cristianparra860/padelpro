const fetch = require('node-fetch');

async function checkAPI() {
  try {
    console.log('🔍 Consultando API /api/timeslots para el 27 de diciembre...\n');
    
    const date = '2025-12-27';
    const url = `http://localhost:9002/api/timeslots?date=${date}&instructors=all`;
    
    console.log(`📡 URL: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      console.log('❌ Error en API:', data.error);
      return;
    }
    
    console.log(`✅ Slots recibidos: ${data.slots.length}\n`);
    
    // Filtrar solo los de las 09:00 con Cristian Parra
    const targetSlots = data.slots.filter(s => {
      const hour = new Date(s.start).getUTCHours();
      return hour === 9 && s.instructorName && s.instructorName.includes('Cristian');
    });
    
    console.log(`🎯 Slots de Cristian Parra a las 09:00: ${targetSlots.length}\n`);
    
    for (const slot of targetSlots) {
      console.log('─'.repeat(80));
      console.log(`🎾 TimeSlot ID: ${slot.id}`);
      console.log(`   👨‍🏫 Instructor: ${slot.instructorName}`);
      console.log(`   📅 Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   🏷️  Nivel: ${slot.level || 'NULL'}`);
      console.log(`   🏷️  LevelRange: ${slot.levelRange || 'NULL'}`);
      console.log(`   👥 Categoría: ${slot.genderCategory || 'NULL'}`);
      console.log(`   🏟️  Pista: ${slot.courtNumber || 'NULL'}`);
      console.log(`   📊 Bookings: ${slot.bookings?.length || 0}`);
      
      if (slot.bookings && slot.bookings.length > 0) {
        console.log('\n   📋 Bookings:');
        slot.bookings.forEach((b, i) => {
          console.log(`      ${i+1}. ${b.status || 'UNKNOWN'} - ${b.userName || b.name || 'Sin nombre'}`);
          console.log(`         GroupSize: ${b.groupSize}`);
        });
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAPI();
