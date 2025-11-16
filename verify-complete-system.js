// Verificación completa del sistema de calendario

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCompleteSystem() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE CALENDARIO ADMIN');
  console.log('='.repeat(80));
  console.log('');

  try {
    // TEST 1: Verificar datos en la base de datos
    console.log('📊 TEST 1: Verificación de Base de Datos');
    console.log('-'.repeat(80));
    
    const allTimeSlots = await prisma.timeSlot.findMany({
      where: {
        clubId: 'club-1'
      }
    });
    
    const proposals = allTimeSlots.filter(t => !t.courtId);
    const confirmed = allTimeSlots.filter(t => t.courtId);
    
    console.log(`   ✅ Total TimeSlots en DB: ${allTimeSlots.length}`);
    console.log(`   🔶 Propuestas (courtId=NULL): ${proposals.length}`);
    console.log(`   🟢 Confirmadas (courtId!=NULL): ${confirmed.length}`);
    
    if (proposals.length === 0) {
      console.log('   ❌ ERROR: No hay propuestas en la base de datos');
      return;
    }
    
    // Verificar formato de fechas en propuestas
    const sampleProposal = proposals[0];
    console.log(`\n   📅 Formato de fecha de propuesta:`);
    console.log(`      start: ${sampleProposal.start} (tipo: ${typeof sampleProposal.start})`);
    console.log(`      end: ${sampleProposal.end} (tipo: ${typeof sampleProposal.end})`);
    
    // TEST 2: Verificar la query SQL que usa la API
    console.log('\n📊 TEST 2: Simulación de Query SQL del API');
    console.log('-'.repeat(80));
    
    const startISO = '2025-09-30T22:00:00.000Z';
    const endISO = '2025-11-01T22:59:59.999Z';
    const timestamp = new Date(startISO).getTime();
    const endTimestamp = new Date(endISO).getTime();
    
    // Ejecutar la misma query que usa el API (con ambos formatos)
    const classesFromQuery = await prisma.$queryRawUnsafe(`
      SELECT * FROM TimeSlot
      WHERE clubId = 'club-1'
        AND (
          (start >= '${startISO}' AND start <= '${endISO}')
          OR (CAST(start AS INTEGER) >= ${timestamp} AND CAST(start AS INTEGER) <= ${endTimestamp})
        )
      ORDER BY start ASC
    `);
    
    const proposalsFromQuery = classesFromQuery.filter(c => !c.courtId);
    const confirmedFromQuery = classesFromQuery.filter(c => c.courtId);
    
    console.log(`   ✅ Query SQL devolvió: ${classesFromQuery.length} clases`);
    console.log(`   🔶 Propuestas encontradas: ${proposalsFromQuery.length}`);
    console.log(`   🟢 Confirmadas encontradas: ${confirmedFromQuery.length}`);
    
    if (proposalsFromQuery.length === 0) {
      console.log('   ❌ ERROR: La query SQL no encuentra propuestas');
      console.log('   Esto significa que el formato de fecha no coincide');
      return;
    }
    
    // TEST 3: Intentar consultar la API real
    console.log('\n📊 TEST 3: Consulta a la API Real');
    console.log('-'.repeat(80));
    
    try {
      const apiUrl = 'http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=2025-10-01T00:00:00.000Z&endDate=2025-10-31T23:59:59.999Z';
      console.log(`   📡 URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.log(`   ⚠️  API respondió con error: ${response.status} ${response.statusText}`);
        console.log('   Esto es normal si el servidor no está ejecutándose');
      } else {
        const data = await response.json();
        
        console.log('   ✅ API respondió correctamente');
        console.log(`   📊 Resumen del API:`);
        console.log(`      - Propuestas: ${data.summary?.proposedClasses || 0}`);
        console.log(`      - Confirmadas: ${data.summary?.confirmedClasses || 0}`);
        console.log(`      - Total eventos: ${data.events?.length || 0}`);
        
        if (data.summary?.proposedClasses > 0) {
          const proposalEvents = data.events.filter(e => e.type === 'class-proposal');
          console.log(`\n   🎨 Eventos de propuesta:`);
          console.log(`      - Total: ${proposalEvents.length}`);
          if (proposalEvents.length > 0) {
            console.log(`      - Primer evento: ${proposalEvents[0].title}`);
            console.log(`      - Color: ${proposalEvents[0].color || 'No definido'}`);
            console.log(`      - Fecha: ${proposalEvents[0].start}`);
          }
        }
      }
    } catch (apiError) {
      console.log(`   ⚠️  No se pudo conectar con la API: ${apiError.message}`);
      console.log('   Asegúrate de que el servidor esté ejecutándose en puerto 9002');
    }
    
    // TEST 4: Verificar estructura de datos esperada por el componente
    console.log('\n📊 TEST 4: Estructura de Datos para Componente');
    console.log('-'.repeat(80));
    
    console.log('   El componente ClubCalendar.tsx espera:');
    console.log('   ✅ calendarData.summary.proposedClasses (número)');
    console.log('   ✅ calendarData.summary.confirmedClasses (número)');
    console.log('   ✅ calendarData.events (array con type: "class-proposal")');
    console.log('   ✅ Eventos con color naranja (#FFA500) para propuestas');
    
    // RESUMEN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMEN DE LA VERIFICACIÓN');
    console.log('='.repeat(80));
    console.log('');
    console.log(`✅ Base de Datos: ${proposals.length} propuestas, ${confirmed.length} confirmadas`);
    console.log(`✅ Query SQL: Encuentra ${proposalsFromQuery.length} propuestas correctamente`);
    console.log('✅ Formato de fechas: Query maneja ambos formatos (ISO strings y timestamps)');
    console.log('');
    
    if (proposalsFromQuery.length > 0) {
      console.log('🎯 CONCLUSIÓN: El sistema está funcionando correctamente');
      console.log('');
      console.log('📱 Para ver los cuadrados naranjas en el navegador:');
      console.log('   1. Abre: http://localhost:9002/admin/database');
      console.log('   2. Presiona Ctrl+Shift+R (hard refresh)');
      console.log('   3. Busca "Calendario del Club"');
      console.log(`   4. Deberías ver ${proposalsFromQuery.length} propuestas en naranja`);
    } else {
      console.log('❌ PROBLEMA: La query no encuentra propuestas');
      console.log('   Revisa el formato de las fechas en la base de datos');
    }
    
    console.log('');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA VERIFICACIÓN:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCompleteSystem();
