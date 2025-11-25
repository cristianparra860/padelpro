/**
 * Test API endpoint with Prisma ORM fix
 * Verifies that the API now returns all 6 cards including both Carlos cards
 */

async function testAPI() {
  console.log('🧪 Testing API with Prisma ORM fix...\n');
  
  const clubId = 'padel-estrella-madrid'; // ID correcto del club
  const date = '2025-01-24'; // Fecha que el usuario está viendo
  
  try {
    const response = await fetch(`http://localhost:9002/api/timeslots?clubId=${clubId}&date=${date}`);
    const data = await response.json();
    
    console.log('📦 Response structure:', typeof data);
    console.log('📦 Response keys:', Object.keys(data));
    
    // El API devuelve { slots: [...], pagination: {...} }
    const timeSlots = data.slots || [];
    
    console.log(`📊 Total TimeSlots devueltos por API: ${timeSlots.length}`);
    
    if (timeSlots.length > 0) {
      console.log('📋 Muestra del primer slot:', {
        id: timeSlots[0].id.substring(0, 12) + '...',
        start: timeSlots[0].start,
        level: timeSlots[0].level,
        instructor: timeSlots[0].instructor?.name
      });
    }
    
    // Filtrar solo las tarjetas a las 7:00 hora España (06:00 UTC)
    const slots7AM = timeSlots.filter(slot => {
      const startDate = new Date(slot.start);
      const hour = startDate.getUTCHours();
      return hour === 6; // 06:00 UTC = 07:00 España
    });
    
    console.log(`📊 TimeSlots a las 7:00 (06:00 UTC): ${slots7AM.length}\n`);
    
    // Agrupar por instructor
    const instructorGroups = {};
    slots7AM.forEach(slot => {
      const name = slot.instructor?.name || 'Sin instructor';
      if (!instructorGroups[name]) {
        instructorGroups[name] = [];
      }
      instructorGroups[name].push(slot);
    });
    
    console.log('📋 Tarjetas por instructor:\n');
    Object.entries(instructorGroups).forEach(([instructor, slots]) => {
      console.log(`   ${instructor}: ${slots.length} tarjeta(s)`);
      slots.forEach(slot => {
        console.log(`      - ${slot.level} | ${slot.genderCategory || 'sin categoría'} | ID: ${slot.id.substring(0, 12)}...`);
      });
    });
    
    // Verificar Carlos Martinez
    const carlosSlots = instructorGroups['Carlos Martinez'] || [];
    console.log(`\n🎯 RESULTADO CARLOS MARTINEZ:`);
    console.log(`   Tarjetas encontradas: ${carlosSlots.length}`);
    
    if (carlosSlots.length === 2) {
      console.log('   ✅ CORRECTO: Se encontraron las 2 tarjetas esperadas');
      console.log('      1. AVANZADO | masculino');
      console.log('      2. ABIERTO | mixto');
    } else if (carlosSlots.length === 1) {
      console.log('   ❌ ERROR: Solo se encontró 1 tarjeta (debería ser 2)');
      console.log(`      Tarjeta: ${carlosSlots[0].level} | ${carlosSlots[0].genderCategory || 'sin categoría'}`);
    } else {
      console.log('   ❌ ERROR CRÍTICO: No se encontraron tarjetas de Carlos');
    }
    
    console.log(`\n📈 TOTALES:`);
    console.log(`   Total instructores: ${Object.keys(instructorGroups).length}`);
    console.log(`   Total tarjetas 7:00: ${slots7AM.length}`);
    console.log(`   Esperado: 6 tarjetas (1 por instructor excepto Carlos con 2)`);
    
    if (slots7AM.length === 6) {
      console.log('\n✅ ¡ÉXITO! El API devuelve las 6 tarjetas correctas');
    } else {
      console.log(`\n❌ FALLO: El API devuelve ${slots7AM.length} tarjetas en lugar de 6`);
    }
    
  } catch (error) {
    console.error('❌ Error al llamar al API:', error.message);
  }
}

testAPI();
