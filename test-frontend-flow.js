// Script para verificar qué recibe exactamente ClassCardReal
// Simula el proceso completo: API -> ClassesDisplay -> ClassCardReal

const clubId = 'padel-estrella-madrid';
const date = '2025-12-11';

async function testCompleteFlow() {
  console.log('🧪 TEST FLUJO COMPLETO DE DATOS\n');
  console.log('═══════════════════════════════════════\n');
  
  // 1. Llamar a la API como lo haría el frontend
  console.log('1️⃣ Llamando a API /api/timeslots...\n');
  
  const apiUrl = `http://localhost:9002/api/timeslots?clubId=${clubId}&date=${date}`;
  const apiResponse = await fetch(apiUrl);
  const apiData = await apiResponse.json();
  
  console.log(`✅ API retornó ${apiData.slots.length} slots\n`);
  
  // 2. Filtrar slots con reciclaje (como lo haría ClassesDisplay)
  const recycledSlots = apiData.slots.filter(slot => 
    slot.hasRecycledSlots === true || 
    (slot.availableRecycledSlots !== null && slot.availableRecycledSlots !== undefined && slot.availableRecycledSlots > 0)
  );
  
  console.log(`2️⃣ Slots con reciclaje detectados: ${recycledSlots.length}\n`);
  
  if (recycledSlots.length === 0) {
    console.log('❌ NO HAY SLOTS CON RECICLAJE\n');
    console.log('Debugging primeros 3 slots:\n');
    apiData.slots.slice(0, 3).forEach((slot, i) => {
      console.log(`Slot ${i + 1}:`, {
        instructor: slot.instructorName,
        court: slot.courtNumber,
        hasRecycledSlots: slot.hasRecycledSlots,
        availableRecycledSlots: slot.availableRecycledSlots
      });
    });
    return;
  }
  
  // 3. Simular lo que recibiría ClassCardReal
  const testSlot = recycledSlots[0];
  
  console.log('3️⃣ Datos que recibe ClassCardReal (props.classData):\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`   ID: ${testSlot.id}`);
  console.log(`   Instructor: ${testSlot.instructorName}`);
  console.log(`   Pista: ${testSlot.courtNumber}`);
  console.log(`   Max Players: ${testSlot.maxPlayers}`);
  console.log('');
  console.log('   ♻️ Campos de reciclaje:');
  console.log(`   hasRecycledSlots: ${testSlot.hasRecycledSlots} (tipo: ${typeof testSlot.hasRecycledSlots})`);
  console.log(`   availableRecycledSlots: ${testSlot.availableRecycledSlots} (tipo: ${typeof testSlot.availableRecycledSlots})`);
  console.log(`   recycledSlotsOnlyPoints: ${testSlot.recycledSlotsOnlyPoints} (tipo: ${typeof testSlot.recycledSlotsOnlyPoints})`);
  console.log('');
  
  // 4. Simular la lógica del componente ClassCardReal
  console.log('4️⃣ Simulando lógica de ClassCardReal.tsx:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const hasCourtNumber = testSlot.courtNumber != null && testSlot.courtNumber > 0;
  const hasRecycledSlots = testSlot.hasRecycledSlots === true;
  const availableRecycledSlots = testSlot.availableRecycledSlots || 0;
  const recycledSlotsOnlyPoints = testSlot.recycledSlotsOnlyPoints === true;
  const shouldShowBadge = hasCourtNumber && hasRecycledSlots && availableRecycledSlots > 0;
  
  console.log('   Variables calculadas:');
  console.log(`   hasCourtNumber = ${hasCourtNumber} (courtNumber=${testSlot.courtNumber})`);
  console.log(`   hasRecycledSlots = ${hasRecycledSlots} (hasRecycledSlots=${testSlot.hasRecycledSlots})`);
  console.log(`   availableRecycledSlots = ${availableRecycledSlots}`);
  console.log(`   recycledSlotsOnlyPoints = ${recycledSlotsOnlyPoints}`);
  console.log('');
  console.log(`   shouldShowBadge = ${shouldShowBadge}`);
  console.log('');
  
  // 5. Diagnóstico
  console.log('5️⃣ DIAGNÓSTICO:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (shouldShowBadge) {
    console.log('✅ El badge DEBERÍA mostrarse');
    console.log('');
    console.log('   Texto del badge:');
    console.log(`   "${availableRecycledSlots} plaza${availableRecycledSlots !== 1 ? 's' : ''} reciclada${availableRecycledSlots !== 1 ? 's' : ''} - Solo con puntos"`);
  } else {
    console.log('❌ El badge NO se mostrará');
    console.log('');
    console.log('   Razones posibles:');
    if (!hasCourtNumber) console.log('   - No tiene pista asignada (courtNumber)');
    if (!hasRecycledSlots) console.log('   - hasRecycledSlots no es true');
    if (availableRecycledSlots <= 0) console.log('   - availableRecycledSlots es 0 o menor');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 6. Verificar bookings
  if (testSlot.bookings && testSlot.bookings.length > 0) {
    console.log('6️⃣ Bookings en este slot:\n');
    testSlot.bookings.forEach((b, i) => {
      console.log(`   ${i + 1}. Status: ${b.status}, Size: ${b.groupSize}, isRecycled: ${b.isRecycled || false}`);
    });
    console.log('');
  }
}

testCompleteFlow().catch(console.error);
