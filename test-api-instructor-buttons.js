// Simular llamadas al API como lo hace el navegador
const fetch = require('node-fetch');

async function testInstructorButtons() {
  console.log('🧪 Test: Verificando botones de instructor en el frontend\n');
  
  const baseURL = 'http://localhost:9002';
  
  try {
    // 1. Simular detección de instructor
    console.log('1️⃣ Verificando si user-cristian-parra es instructor...');
    const instructorCheck = await fetch(`${baseURL}/api/instructors/by-user/user-cristian-parra`);
    
    if (!instructorCheck.ok) {
      console.log('❌ API responded with:', instructorCheck.status);
      const text = await instructorCheck.text();
      console.log('Response:', text);
      return;
    }
    
    const instructorData = await instructorCheck.json();
    console.log('✅ Response:', JSON.stringify(instructorData, null, 2));
    
    const instructorId = instructorData.instructor?.id || instructorData.id;
    console.log(`\n🎓 Instructor ID detectado: ${instructorId}\n`);
    
    // 2. Obtener algunos timeslots
    console.log('2️⃣ Obteniendo timeslots del día de hoy...');
    const today = new Date().toISOString().split('T')[0];
    const slotsResponse = await fetch(`${baseURL}/api/timeslots?clubId=club-1&date=${today}`);
    
    if (!slotsResponse.ok) {
      console.log('❌ Error obteniendo slots:', slotsResponse.status);
      return;
    }
    
    const slotsData = await slotsResponse.json();
    const slots = slotsData.slots || [];
    console.log(`✅ Obtenidos ${slots.length} slots\n`);
    
    // 3. Verificar permisos para cada slot
    console.log('3️⃣ Verificando permisos para cada slot:\n');
    
    let slotsConBotones = 0;
    let slotsSinBotones = 0;
    
    slots.slice(0, 10).forEach((slot, i) => {
      const canEdit = instructorId === slot.instructorId;
      
      console.log(`${i+1}. ${slot.instructorName || 'Sin nombre'}`);
      console.log(`   Slot ID: ${slot.id?.substring(0, 15)}...`);
      console.log(`   Instructor del slot: ${slot.instructorId}`);
      console.log(`   Instructor logueado: ${instructorId}`);
      console.log(`   ¿Coinciden?: ${instructorId === slot.instructorId ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   ¿Mostrar botones 🎁/€?: ${canEdit ? '✅ SÍ' : '❌ NO'}\n`);
      
      if (canEdit) slotsConBotones++;
      else slotsSinBotones++;
    });
    
    // 4. Resumen
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`   Total slots analizados: ${Math.min(10, slots.length)}`);
    console.log(`   Slots CON botones 🎁/€: ${slotsConBotones}`);
    console.log(`   Slots SIN botones: ${slotsSinBotones}\n`);
    
    if (slotsConBotones > 0) {
      console.log('✅ SUCCESS: Los botones aparecerán solo en clases de Cristian Parra');
    } else if (slots.length > 0) {
      console.log('⚠️ WARNING: No hay clases de Cristian Parra en los primeros 10 slots');
      console.log('   Esto es normal si hay más instructores. Los botones aparecerán en sus clases.');
    } else {
      console.log('❌ ERROR: No hay slots disponibles para hoy');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Asegúrate de que el servidor esté corriendo en http://localhost:9002');
  }
}

testInstructorButtons();
