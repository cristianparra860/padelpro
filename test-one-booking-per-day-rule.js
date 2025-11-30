const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOneBookingPerDayRule() {
  console.log('🧪 TEST: NORMA DE UNA RESERVA CONFIRMADA POR DÍA\n');
  console.log('=' .repeat(60));
  
  const testUserId = 'user-cristian-parra';
  const testDate = new Date('2025-11-28T00:00:00.000Z');
  const startOfDay = new Date(Date.UTC(testDate.getUTCFullYear(), testDate.getUTCMonth(), testDate.getUTCDate(), 0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(Date.UTC(testDate.getUTCFullYear(), testDate.getUTCMonth(), testDate.getUTCDate(), 23, 59, 59, 999)).toISOString();
  
  console.log(`📅 Fecha de prueba: ${testDate.toISOString().split('T')[0]}`);
  console.log(`👤 Usuario de prueba: ${testUserId}\n`);
  
  // 1. Verificar estado actual
  console.log('1️⃣ ESTADO ACTUAL:');
  console.log('-'.repeat(60));
  
  const allBookings = await prisma.$queryRaw`
    SELECT b.id, b.status, b.groupSize, b.amountBlocked, ts.start, ts.courtNumber, ts.level, ts.genderCategory
    FROM Booking b
    JOIN TimeSlot ts ON b.timeSlotId = ts.id
    WHERE b.userId = ${testUserId}
    AND ts.start >= ${startOfDay}
    AND ts.start <= ${endOfDay}
    ORDER BY ts.start, b.status DESC
  `;
  
  console.log(`📊 Total de bookings para ${testUserId} el ${testDate.toISOString().split('T')[0]}: ${allBookings.length}\n`);
  
  const confirmedBookings = allBookings.filter(b => b.status === 'CONFIRMED');
  const pendingBookings = allBookings.filter(b => b.status === 'PENDING');
  const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED');
  
  console.log(`   ✅ CONFIRMED (con pista): ${confirmedBookings.length}`);
  for (const booking of confirmedBookings) {
    const time = new Date(Number(booking.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    console.log(`      - ${booking.id}: ${time} (Pista ${booking.courtNumber}) - ${booking.level}/${booking.genderCategory}`);
  }
  
  console.log(`   ⏳ PENDING (sin pista): ${pendingBookings.length}`);
  for (const booking of pendingBookings) {
    const time = new Date(Number(booking.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    console.log(`      - ${booking.id}: ${time} - ${booking.level}/${booking.genderCategory}`);
  }
  
  console.log(`   ❌ CANCELLED: ${cancelledBookings.length}`);
  for (const booking of cancelledBookings) {
    const time = new Date(Number(booking.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    console.log(`      - ${booking.id}: ${time}`);
  }
  
  // 2. Verificar la norma
  console.log('\n2️⃣ VERIFICACIÓN DE LA NORMA:');
  console.log('-'.repeat(60));
  
  if (confirmedBookings.length > 1) {
    console.log('❌ VIOLACIÓN: El usuario tiene MÁS de una reserva confirmada');
    console.log(`   Encontradas: ${confirmedBookings.length} reservas confirmadas`);
    for (const booking of confirmedBookings) {
      const time = new Date(Number(booking.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   - ${time} (Pista ${booking.courtNumber})`);
    }
  } else if (confirmedBookings.length === 1) {
    console.log('✅ CORRECTO: El usuario tiene exactamente UNA reserva confirmada');
    const booking = confirmedBookings[0];
    const time = new Date(Number(booking.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    console.log(`   - ${time} (Pista ${booking.courtNumber})`);
    
    if (pendingBookings.length > 0) {
      console.log(`\n⚠️ ATENCIÓN: El usuario tiene ${pendingBookings.length} inscripciones PENDING`);
      console.log('   ℹ️ Estas deberían haberse cancelado al confirmar la reserva');
      for (const booking of pendingBookings) {
        const time = new Date(Number(booking.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   - ${time} - ${booking.level}/${booking.genderCategory}`);
      }
    } else {
      console.log('✅ No hay inscripciones PENDING (correcto)');
    }
  } else {
    console.log('ℹ️ El usuario no tiene reservas confirmadas este día');
    if (pendingBookings.length > 0) {
      console.log(`   Tiene ${pendingBookings.length} inscripciones PENDING esperando completarse`);
    }
  }
  
  // 3. Verificar solapamientos
  console.log('\n3️⃣ VERIFICACIÓN DE SOLAPAMIENTOS:');
  console.log('-'.repeat(60));
  
  const overlaps = [];
  for (let i = 0; i < confirmedBookings.length; i++) {
    for (let j = i + 1; j < confirmedBookings.length; j++) {
      const b1 = confirmedBookings[i];
      const b2 = confirmedBookings[j];
      
      if (b1.courtNumber === b2.courtNumber) {
        const start1 = Number(b1.start);
        const start2 = Number(b2.start);
        const end1 = start1 + (60 * 60 * 1000);
        const end2 = start2 + (60 * 60 * 1000);
        
        if (start1 < end2 && start2 < end1) {
          overlaps.push({ b1, b2 });
        }
      }
    }
  }
  
  if (overlaps.length > 0) {
    console.log(`❌ SOLAPAMIENTOS ENCONTRADOS: ${overlaps.length}`);
    for (const { b1, b2 } of overlaps) {
      const time1 = new Date(Number(b1.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const time2 = new Date(Number(b2.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   - Pista ${b1.courtNumber}: ${time1} vs ${time2}`);
    }
  } else {
    console.log('✅ No se encontraron solapamientos');
  }
  
  // 4. Resumen
  console.log('\n4️⃣ RESUMEN:');
  console.log('='.repeat(60));
  
  const passedTests = [];
  const failedTests = [];
  
  if (confirmedBookings.length <= 1) {
    passedTests.push('✅ Máximo una reserva confirmada por día');
  } else {
    failedTests.push(`❌ Múltiples reservas confirmadas (${confirmedBookings.length})`);
  }
  
  if (confirmedBookings.length === 1 && pendingBookings.length === 0) {
    passedTests.push('✅ Inscripciones pendientes canceladas correctamente');
  } else if (confirmedBookings.length === 1 && pendingBookings.length > 0) {
    failedTests.push(`❌ Quedan ${pendingBookings.length} inscripciones pendientes sin cancelar`);
  }
  
  if (overlaps.length === 0) {
    passedTests.push('✅ Sin solapamientos de pistas');
  } else {
    failedTests.push(`❌ ${overlaps.length} solapamientos encontrados`);
  }
  
  console.log('\n📊 Tests pasados:');
  passedTests.forEach(test => console.log(`   ${test}`));
  
  if (failedTests.length > 0) {
    console.log('\n❌ Tests fallidos:');
    failedTests.forEach(test => console.log(`   ${test}`));
  }
  
  console.log('\n' + '='.repeat(60));
  if (failedTests.length === 0) {
    console.log('✅ ¡TODOS LOS TESTS PASARON! La norma se está aplicando correctamente.');
  } else {
    console.log('❌ ALGUNOS TESTS FALLARON. Revisar implementación.');
  }
  
  await prisma.$disconnect();
}

testOneBookingPerDayRule().catch(console.error);
