// Verificación completa del sistema de calendario

async function fullSystemCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE CALENDARIO');
  console.log('='.repeat(80));
  
  // Esperar a que el servidor esté listo
  console.log('\n⏳ Esperando a que el servidor esté listo...');
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  try {
    // 1. Verificar API /api/admin/calendar
    console.log('\n📡 TEST 1: Verificar API /api/admin/calendar');
    console.log('-'.repeat(80));
    
    const calendarResponse = await fetch('http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=2025-10-01T00:00:00.000Z&endDate=2025-10-31T23:59:59.999Z');
    
    if (!calendarResponse.ok) {
      console.log('❌ Error en la API:', calendarResponse.status, calendarResponse.statusText);
      return;
    }
    
    const calendarData = await calendarResponse.json();
    
    console.log('✅ API respondió correctamente');
    console.log('   📊 Clases Propuestas:', calendarData.proposedClasses);
    console.log('   📊 Clases Confirmadas:', calendarData.confirmedClasses);
    console.log('   📊 Instructores:', calendarData.instructors);
    console.log('   📊 Pistas:', calendarData.courts);
    
    if (calendarData.proposedClasses === 0) {
      console.log('\n❌ PROBLEMA: La API devuelve 0 propuestas');
      console.log('   Esto significa que la query SQL no está encontrando las propuestas');
      return;
    }
    
    console.log('\n✅ TEST 1 PASADO: La API devuelve propuestas correctamente');
    
    // 2. Verificar estructura de las propuestas
    console.log('\n📋 TEST 2: Verificar estructura de datos');
    console.log('-'.repeat(80));
    
    if (!calendarData.events || calendarData.events.length === 0) {
      console.log('❌ No hay eventos en la respuesta');
      return;
    }
    
    const proposalEvents = calendarData.events.filter(e => e.type === 'proposal');
    const confirmedEvents = calendarData.events.filter(e => e.type === 'confirmed');
    
    console.log('✅ Estructura de eventos correcta');
    console.log('   🔶 Eventos de tipo "proposal":', proposalEvents.length);
    console.log('   🟢 Eventos de tipo "confirmed":', confirmedEvents.length);
    
    if (proposalEvents.length === 0) {
      console.log('\n❌ PROBLEMA: No hay eventos de tipo "proposal"');
      console.log('   Los datos están en la API pero no se convierten a eventos');
      return;
    }
    
    // Mostrar ejemplo de propuesta
    const sampleProposal = proposalEvents[0];
    console.log('\n   📄 Ejemplo de propuesta:');
    console.log('      ID:', sampleProposal.id);
    console.log('      Título:', sampleProposal.title);
    console.log('      Inicio:', sampleProposal.start);
    console.log('      Fin:', sampleProposal.end);
    console.log('      Color:', sampleProposal.color || 'Sin color definido');
    
    console.log('\n✅ TEST 2 PASADO: Los eventos tienen la estructura correcta');
    
    // 3. Verificar que las propuestas tengan color naranja
    console.log('\n🎨 TEST 3: Verificar colores de las propuestas');
    console.log('-'.repeat(80));
    
    const proposalsWithOrangeColor = proposalEvents.filter(e => 
      e.color && (e.color.includes('orange') || e.color.includes('#f97316') || e.color.includes('rgb(249, 115, 22)'))
    );
    
    if (proposalsWithOrangeColor.length === 0) {
      console.log('⚠️  ADVERTENCIA: Las propuestas no tienen color naranja explícito');
      console.log('   Esto podría estar bien si el color se aplica en el componente');
      console.log('   Color actual del primer evento:', sampleProposal.color || 'undefined');
    } else {
      console.log('✅ Las propuestas tienen color naranja');
      console.log('   Eventos con color naranja:', proposalsWithOrangeColor.length);
    }
    
    // 4. Verificar API /api/admin/timeslots (la otra API)
    console.log('\n📡 TEST 4: Verificar API /api/admin/timeslots (backup)');
    console.log('-'.repeat(80));
    
    const timeslotsResponse = await fetch('http://localhost:9002/api/admin/timeslots?clubId=club-1');
    
    if (!timeslotsResponse.ok) {
      console.log('⚠️  API /api/admin/timeslots no respondió correctamente');
    } else {
      const timeslotsData = await timeslotsResponse.json();
      const proposalsInTimeslots = timeslotsData.filter(t => !t.courtId);
      console.log('✅ API /api/admin/timeslots funciona');
      console.log('   Total slots:', timeslotsData.length);
      console.log('   Propuestas (courtId=null):', proposalsInTimeslots.length);
    }
    
    // 5. Resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log('');
    console.log('🔶 PROPUESTAS EN LA API:', calendarData.proposedClasses);
    console.log('🔶 EVENTOS DE PROPUESTAS:', proposalEvents.length);
    console.log('🟢 CLASES CONFIRMADAS:', calendarData.confirmedClasses);
    console.log('');
    
    if (calendarData.proposedClasses > 0 && proposalEvents.length > 0) {
      console.log('✅✅✅ TODO CORRECTO ✅✅✅');
      console.log('');
      console.log('🎯 INSTRUCCIONES PARA VER LOS CUADRADOS NARANJAS:');
      console.log('   1. Abre el navegador en: http://localhost:9002/admin/database');
      console.log('   2. Presiona Ctrl+Shift+R para recargar (limpia caché)');
      console.log('   3. Busca la sección "Calendario del Club"');
      console.log('   4. Deberías ver:', calendarData.proposedClasses, 'propuestas en naranja');
      console.log('');
    } else {
      console.log('❌ HAY PROBLEMAS QUE RESOLVER');
      console.log('');
      console.log('Revisa los tests anteriores para ver dónde falló');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA VERIFICACIÓN:', error.message);
    console.error('\nDetalles:', error);
  }
}

fullSystemCheck();
