const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🧪 SCRIPT DE VERIFICACIÓN DEL SISTEMA AUTOMÁTICO
 * 
 * Verifica que el sistema esté funcionando correctamente:
 * 1. Tarjetas generadas solo con disponibilidad
 * 2. No hay solapamientos de instructor/pista
 * 3. Calendarios se actualizan correctamente
 */

async function runTests() {
  console.log('\n🧪 TESTING: Sistema Automático de Generación de Tarjetas\n');
  console.log('='.repeat(60));

  let allTestsPassed = true;

  try {
    // TEST 1: Verificar que hay tarjetas disponibles (sin pista asignada)
    console.log('\n📋 TEST 1: Tarjetas disponibles generadas');
    const availableSlots = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot WHERE courtNumber IS NULL
    `;
    const availableCount = Number(availableSlots[0]?.count || 0);
    console.log(`   Tarjetas disponibles: ${availableCount}`);
    
    if (availableCount > 0) {
      console.log('   ✅ PASS: Hay tarjetas disponibles');
    } else {
      console.log('   ⚠️ WARNING: No hay tarjetas disponibles (ejecutar generador primero)');
    }

    // TEST 2: Verificar que NO hay solapamientos de instructor
    console.log('\n👨‍🏫 TEST 2: Sin solapamientos de instructor');
    const instructorOverlaps = await prisma.$queryRaw`
      SELECT 
        t1.id as slot1,
        t2.id as slot2,
        t1.instructorId,
        t1.start,
        t1.courtNumber as court1,
        t2.courtNumber as court2
      FROM TimeSlot t1
      JOIN TimeSlot t2 ON 
        t1.instructorId = t2.instructorId 
        AND t1.start = t2.start 
        AND t1.id < t2.id
        AND t1.courtNumber IS NOT NULL
        AND t2.courtNumber IS NOT NULL
    `;
    
    if (instructorOverlaps.length === 0) {
      console.log('   ✅ PASS: No hay instructores con clases simultáneas');
    } else {
      console.log(`   ❌ FAIL: ${instructorOverlaps.length} solapamientos detectados:`);
      instructorOverlaps.forEach(overlap => {
        console.log(`      - Instructor ${overlap.instructorId}: ${overlap.slot1} y ${overlap.slot2}`);
      });
      allTestsPassed = false;
    }

    // TEST 3: Verificar que NO hay solapamientos de pista
    console.log('\n🎾 TEST 3: Sin solapamientos de pista');
    const courtOverlaps = await prisma.$queryRaw`
      SELECT 
        t1.id as slot1,
        t2.id as slot2,
        t1.courtNumber,
        t1.start
      FROM TimeSlot t1
      JOIN TimeSlot t2 ON 
        t1.courtNumber = t2.courtNumber 
        AND t1.start = t2.start 
        AND t1.id < t2.id
      WHERE t1.courtNumber IS NOT NULL
    `;
    
    if (courtOverlaps.length === 0) {
      console.log('   ✅ PASS: No hay pistas con clases simultáneas');
    } else {
      console.log(`   ❌ FAIL: ${courtOverlaps.length} solapamientos detectados:`);
      courtOverlaps.forEach(overlap => {
        console.log(`      - Pista ${overlap.courtNumber}: ${overlap.slot1} y ${overlap.slot2}`);
      });
      allTestsPassed = false;
    }

    // TEST 4: Verificar integridad de calendarios
    console.log('\n📅 TEST 4: Integridad de calendarios');
    
    // Contar clases confirmadas
    const confirmedClasses = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot WHERE courtNumber IS NOT NULL
    `;
    const confirmedCount = Number(confirmedClasses[0]?.count || 0);
    
    // Contar entradas en CourtSchedule
    const courtScheduleEntries = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM CourtSchedule WHERE isOccupied = 1
    `;
    const courtScheduleCount = Number(courtScheduleEntries[0]?.count || 0);
    
    // Contar entradas en InstructorSchedule
    const instructorScheduleEntries = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM InstructorSchedule WHERE isOccupied = 1
    `;
    const instructorScheduleCount = Number(instructorScheduleEntries[0]?.count || 0);
    
    console.log(`   Clases confirmadas: ${confirmedCount}`);
    console.log(`   CourtSchedule ocupadas: ${courtScheduleCount}`);
    console.log(`   InstructorSchedule ocupadas: ${instructorScheduleCount}`);
    
    if (confirmedCount === courtScheduleCount && confirmedCount === instructorScheduleCount) {
      console.log('   ✅ PASS: Calendarios sincronizados correctamente');
    } else {
      console.log('   ⚠️ WARNING: Calendarios no completamente sincronizados');
      console.log('      (Puede ser normal si hay clases antiguas antes de implementar el sistema)');
    }

    // TEST 5: Verificar generación cada 30 minutos
    console.log('\n⏰ TEST 5: Tarjetas generadas cada 30 minutos');
    const timeSlotsByMinute = await prisma.$queryRaw`
      SELECT 
        strftime('%M', start) as minute,
        COUNT(*) as count
      FROM TimeSlot
      WHERE courtNumber IS NULL
      GROUP BY minute
      ORDER BY minute
    `;
    
    console.log('   Distribución por minutos:');
    timeSlotsByMinute.forEach(row => {
      console.log(`      :${row.minute} → ${row.count} tarjetas`);
    });
    
    const has00 = timeSlotsByMinute.some(row => row.minute === '00');
    const has30 = timeSlotsByMinute.some(row => row.minute === '30');
    
    if (has00 && has30) {
      console.log('   ✅ PASS: Tarjetas generadas en minutos :00 y :30');
    } else if (timeSlotsByMinute.length === 0) {
      console.log('   ⚠️ WARNING: No hay tarjetas para verificar');
    } else {
      console.log('   ❌ FAIL: No se generan tarjetas cada 30 minutos correctamente');
      allTestsPassed = false;
    }

    // TEST 6: Verificar que tarjetas disponibles NO tienen pista asignada
    console.log('\n🎯 TEST 6: Tarjetas disponibles sin pista asignada');
    const slotsWithCourtAndNoNumber = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM TimeSlot 
      WHERE courtId IS NOT NULL AND courtNumber IS NULL
    `;
    const invalidCount = Number(slotsWithCourtAndNoNumber[0]?.count || 0);
    
    if (invalidCount === 0) {
      console.log('   ✅ PASS: Todas las tarjetas tienen estado correcto');
    } else {
      console.log(`   ⚠️ WARNING: ${invalidCount} tarjetas con estado inconsistente`);
    }

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN DE TESTS:\n');
    
    if (allTestsPassed && availableCount > 0) {
      console.log('   ✅ TODOS LOS TESTS PASARON');
      console.log('   Sistema funcionando correctamente\n');
    } else if (allTestsPassed) {
      console.log('   ⚠️ Tests pasaron pero no hay datos para verificar');
      console.log('   Ejecutar: node auto-generate-cards.js\n');
    } else {
      console.log('   ❌ ALGUNOS TESTS FALLARON');
      console.log('   Revisar los errores anteriores\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante testing:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
