// Script para verificar qué datos retorna la API /api/timeslots
const clubId = 'padel-estrella-madrid';
const date = '2025-12-11'; // Mañana, donde creamos el test

const url = `http://localhost:9002/api/timeslots?clubId=${clubId}&date=${date}`;

console.log('🌐 Consultando API:', url);
console.log('');

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (!data.slots) {
      console.log('❌ La respuesta no tiene campo "slots"');
      console.log('   Campos disponibles:', Object.keys(data));
      return;
    }
    
    console.log(`✅ API retornó ${data.slots.length} clases\n`);
    
    // Buscar clases con plazas recicladas
    const recycledSlots = data.slots.filter(slot => 
      slot.hasRecycledSlots === true || 
      slot.availableRecycledSlots > 0
    );
    
    if (recycledSlots.length === 0) {
      console.log('❌ NO hay clases con plazas recicladas en la respuesta API\n');
      console.log('📋 Primeras 3 clases para debugging:\n');
      data.slots.slice(0, 3).forEach(slot => {
        const date = new Date(slot.start);
        console.log(`⏰ ${date.toLocaleTimeString()}`);
        console.log(`   Court: ${slot.courtNumber || 'Sin asignar'}`);
        console.log(`   hasRecycledSlots: ${slot.hasRecycledSlots}`);
        console.log(`   availableRecycledSlots: ${slot.availableRecycledSlots}`);
        console.log(`   recycledSlotsOnlyPoints: ${slot.recycledSlotsOnlyPoints}`);
        console.log(`   bookings: ${slot.bookings?.length || 0}`);
        console.log('');
      });
    } else {
      console.log(`✅ Encontradas ${recycledSlots.length} clases con plazas recicladas:\n`);
      
      recycledSlots.forEach(slot => {
        const date = new Date(slot.start);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`⏰ ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        console.log(`   Instructor: ${slot.instructorName}`);
        console.log(`   Pista: ${slot.courtNumber || 'Sin asignar'}`);
        console.log(`   Max Players: ${slot.maxPlayers}`);
        console.log('');
        console.log('   ♻️ DATOS DE RECICLAJE:');
        console.log(`   hasRecycledSlots: ${slot.hasRecycledSlots}`);
        console.log(`   availableRecycledSlots: ${slot.availableRecycledSlots}`);
        console.log(`   recycledSlotsOnlyPoints: ${slot.recycledSlotsOnlyPoints}`);
        console.log('');
        
        if (slot.bookings && slot.bookings.length > 0) {
          console.log(`   📋 Bookings (${slot.bookings.length}):`);
          slot.bookings.forEach((b, i) => {
            console.log(`      ${i+1}. ${b.status} | Size: ${b.groupSize} | isRecycled: ${b.isRecycled || false} | User: ${b.name || b.userName || 'N/A'}`);
          });
        } else {
          console.log('   📋 Sin bookings');
        }
        console.log('');
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🔍 VERIFICACIONES:');
      console.log('   1. ¿hasRecycledSlots es TRUE? ', recycledSlots.some(s => s.hasRecycledSlots === true) ? '✅' : '❌');
      console.log('   2. ¿availableRecycledSlots > 0? ', recycledSlots.some(s => s.availableRecycledSlots > 0) ? '✅' : '❌');
      console.log('   3. ¿Hay bookings CANCELLED con isRecycled=true? ', 
        recycledSlots.some(s => s.bookings?.some(b => b.status === 'CANCELLED' && b.isRecycled === true)) ? '✅' : '❌');
    }
  })
  .catch(err => {
    console.error('❌ Error al consultar API:', err.message);
  });
