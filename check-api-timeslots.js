// Verificar qué devuelve el API de timeslots
const fetch = require('node-fetch');

async function checkTimeslotsAPI() {
  try {
    console.log('\n🔍 VERIFICANDO API DE TIMESLOTS\n');
    console.log('='.repeat(70));
    
    const today = new Date().toISOString().split('T')[0];
    const url = `http://localhost:9002/api/timeslots?date=${today}&clubId=padel-estrella-madrid`;
    
    console.log('URL:', url);
    console.log('\nHaciendo petición...\n');
    
    const response = await fetch(url);
    const data = await response.json();
    
    const slots = data.slots || data;
    
    console.log(`Total slots devueltos: ${slots.length}\n`);
    
    // Filtrar slots de las 7:00
    const slots7am = slots.filter(s => {
      const hora = new Date(s.start).getHours();
      return hora === 7;
    });
    
    console.log(`Slots a las 7:00 (hora local): ${slots7am.length}\n`);
    
    if (slots7am.length > 0) {
      console.log('SLOTS DE LAS 7:00:');
      console.log('─'.repeat(70));
      
      slots7am.forEach((slot, idx) => {
        console.log(`\n${idx + 1}. TimeSlot ID: ${slot.id}`);
        console.log(`   Horario: ${slot.start}`);
        console.log(`   Nivel: ${slot.level}`);
        console.log(`   Instructor: ${slot.instructorName || 'N/A'}`);
        console.log(`   Pista asignada: ${slot.courtNumber || '❌ Sin asignar'}`);
        console.log(`   Total jugadores: ${slot.totalPlayers || 0}`);
        console.log(`   Precio: €${slot.totalPrice || 0}`);
        
        // Ver bookings
        if (slot.bookings && Array.isArray(slot.bookings)) {
          console.log(`   Reservas: ${slot.bookings.length}`);
          slot.bookings.forEach(b => {
            console.log(`   - ${b.userName || 'Usuario'}: ${b.status || 'N/A'} (Grupo: ${b.groupSize || 1})`);
          });
        } else {
          console.log(`   Reservas: 0 (sin datos de bookings)`);
        }
        
        // Si tiene pista pero no reservas - FANTASMA
        if (slot.courtNumber && (!slot.bookings || slot.bookings.length === 0)) {
          console.log('\n   ⚠️⚠️⚠️ FANTASMA DETECTADO EN EL API');
          console.log('   Este slot tiene pista asignada pero sin reservas');
        }
      });
    } else {
      console.log('✅ No hay slots a las 7:00 en la respuesta del API');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTimeslotsAPI();
