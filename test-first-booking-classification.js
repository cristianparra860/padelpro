const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFirstBookingClassification() {
  console.log('🧪 PRUEBA: Clasificación en PRIMER BOOKING\n');
  
  // Buscar usuario María García
  const maria = await prisma.user.findFirst({
    where: { name: { contains: 'María' } }
  });
  
  if (!maria) {
    console.log('❌ Usuario María no encontrado');
    return;
  }
  
  console.log(`✅ Usuario: ${maria.name}`);
  console.log(`   Nivel: ${maria.level}`);
  console.log(`   Género: ${maria.gender}\n`);
  
  // Buscar clase ABIERTO del día 24 a las 7:00 (Cristian Parra)
  const targetDate = new Date('2025-11-24T07:00:00');
  const timestamp = targetDate.getTime();
  
  const slot = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${timestamp}
    AND ts.courtId IS NULL
    AND ts.level = 'ABIERTO'
    AND i.name LIKE '%Cristian%'
    LIMIT 1
  `);
  
  if (slot.length === 0) {
    console.log('❌ No hay clases disponibles de Cristian Parra');
    return;
  }
  
  console.log(`📅 Clase seleccionada: ${slot[0].instructorName}`);
  console.log(`   Nivel actual: ${slot[0].level}`);
  console.log(`   Categoría actual: ${slot[0].genderCategory || 'N/A'}`);
  console.log(`   TimeSlot ID: ${slot[0].id}\n`);
  
  // Verificar cuántas tarjetas hay ANTES
  const beforeCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as total FROM TimeSlot 
    WHERE instructorId = '${slot[0].instructorId}' AND start = ${timestamp}
  `);
  
  console.log(`📊 ANTES: ${beforeCount[0].total} tarjeta(s) de Cristian a las 7:00\n`);
  
  // Hacer la reserva
  console.log('📞 Haciendo reserva con groupSize=2 (NO completa inmediatamente)...\n');
  
  const response = await fetch('http://localhost:9002/api/classes/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeSlotId: slot[0].id,
      userId: maria.id,
      groupSize: 2
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.log('❌ Error:', result.error || result.message);
    return;
  }
  
  console.log('✅ RESERVA EXITOSA\n');
  console.log(`   Booking ID: ${result.bookingId}`);
  console.log(`   ¿Clase completa? ${result.classComplete ? 'SÍ' : 'NO'}`);
  console.log(`   Estado: ${result.classComplete ? 'CONFIRMED' : 'PENDING'}\n`);
  
  // Verificar DESPUÉS
  const afterSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, 
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    WHERE ts.instructorId = '${slot[0].instructorId}' 
    AND ts.start = ${timestamp}
    ORDER BY ts.level DESC, ts.genderCategory
  `);
  
  console.log(`📊 DESPUÉS: ${afterSlots.length} tarjeta(s) de Cristian a las 7:00:\n`);
  
  for (const s of afterSlots) {
    const status = s.courtNumber ? `Pista ${s.courtNumber}` : 'Sin pista';
    console.log(`   • ${s.level.padEnd(15)} | ${(s.genderCategory||'N/A').padEnd(10)} | ${status} | ${s.bookingCount} reserva(s)`);
  }
  
  console.log('\n🎯 RESULTADO:\n');
  
  const classified = afterSlots.find(s => s.level !== 'ABIERTO');
  const duplicate = afterSlots.find(s => s.level === 'ABIERTO' && s.genderCategory === 'mixto');
  
  if (classified) {
    console.log(`   ✅ Tarjeta clasificada: ${classified.level}/${classified.genderCategory}`);
  } else {
    console.log('   ❌ NO se clasificó la tarjeta');
  }
  
  if (duplicate) {
    console.log(`   ✅ Duplicada creada: ABIERTO/mixto`);
  } else {
    console.log('   ❌ NO se creó la duplicada');
  }
  
  if (classified && duplicate) {
    console.log('\n   🎉 ¡SISTEMA FUNCIONANDO CORRECTAMENTE!');
    console.log('   🏁 La carrera puede comenzar con otros usuarios');
  }
  
  prisma.$disconnect();
}

testFirstBookingClassification();
