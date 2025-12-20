// Test API después del fix
setTimeout(async () => {
  try {
    const response = await fetch('http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-11');
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ ERROR EN API:', data.error);
      console.log('   Message:', data.message);
      return;
    }
    
    if (!data.slots) {
      console.log('❌ Respuesta no tiene slots');
      console.log('   Campos:', Object.keys(data));
      return;
    }
    
    console.log(`✅ API OK - ${data.slots.length} slots`);
    
    const testSlot = data.slots.find(s => s.id && s.id.includes('test-recycled-badge'));
    
    if (testSlot) {
      console.log('\n✅ SLOT DE PRUEBA ENCONTRADO:');
      console.log(JSON.stringify({
        id: testSlot.id.substring(0, 30),
        instructor: testSlot.instructorName,
        courtNumber: testSlot.courtNumber,
        hasRecycledSlots: testSlot.hasRecycledSlots,
        availableRecycledSlots: testSlot.availableRecycledSlots,
        recycledSlotsOnlyPoints: testSlot.recycledSlotsOnlyPoints,
        shouldShowBadge: (testSlot.courtNumber != null && testSlot.courtNumber > 0) && testSlot.hasRecycledSlots && (testSlot.availableRecycledSlots > 0)
      }, null, 2));
    } else {
      console.log('\n❌ Slot de prueba NO encontrado');
      console.log('   Primeros 3 IDs:', data.slots.slice(0, 3).map(s => s.id?.substring(0, 25)));
    }
  } catch (err) {
    console.log('❌ Error en fetch:', err.message);
  }
}, 3000);
