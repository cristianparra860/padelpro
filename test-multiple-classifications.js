const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMultipleBookings() {
  console.log('🧪 PRUEBA DE MÚLTIPLES RESERVAS\n');
  
  // Buscar usuario Marc
  const marc = await prisma.user.findFirst({
    where: { email: 'marc.parra@hotmail.es' }
  });
  
  if (!marc) {
    console.log('❌ Usuario Marc no encontrado');
    return;
  }
  
  console.log(`✅ Usuario: ${marc.name} (${marc.level})\n`);
  
  // Buscar 3 clases ABIERTO disponibles del día 25 a las 7:00
  const targetDate = new Date('2025-11-25T07:00:00');
  const timestamp = targetDate.getTime();
  
  const availableSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${timestamp}
    AND ts.courtId IS NULL
    AND ts.level = 'ABIERTO'
    ORDER BY i.name
    LIMIT 3
  `);
  
  console.log(`📋 ${availableSlots.length} clases disponibles para probar\n`);
  
  // Hacer reservas en todas
  let successCount = 0;
  for (const slot of availableSlots) {
    console.log(`📞 Reservando con ${slot.instructorName}...`);
    
    const response = await fetch('http://localhost:9002/api/classes/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeSlotId: slot.id,
        userId: marc.id,
        groupSize: 1
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Reserva exitosa - Pista: ${result.courtAssigned}\n`);
      successCount++;
    } else {
      console.log(`   ❌ Error: ${result.error || result.message}\n`);
    }
  }
  
  console.log(`\n🎯 Resumen: ${successCount}/${availableSlots.length} reservas exitosas\n`);
  
  // Verificar estado final
  console.log('🔍 ESTADO FINAL DEL DÍA 25 A LAS 7:00:\n');
  
  const allSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.id, i.name as instructorName, ts.level, ts.genderCategory, ts.courtNumber,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${timestamp}
    ORDER BY i.name, ts.level
  `);
  
  // Agrupar por instructor
  const byInstructor = {};
  for (const slot of allSlots) {
    if (!byInstructor[slot.instructorName]) {
      byInstructor[slot.instructorName] = [];
    }
    byInstructor[slot.instructorName].push(slot);
  }
  
  for (const [instructor, slots] of Object.entries(byInstructor)) {
    console.log(`👨‍🏫 ${instructor}:`);
    for (const slot of slots) {
      const status = slot.courtNumber ? `✅ Pista ${slot.courtNumber}` : '⏳ Sin asignar';
      console.log(`   ${slot.level.padEnd(15)} | ${(slot.genderCategory || 'mixto').padEnd(10)} | ${status} | ${slot.bookingCount} reserva(s)`);
    }
    console.log();
  }
  
  // Estadísticas
  const classified = allSlots.filter(s => s.level !== 'ABIERTO' && s.courtNumber !== null);
  const duplicates = allSlots.filter(s => s.level === 'ABIERTO' && s.genderCategory === 'mixto');
  
  console.log('📊 ESTADÍSTICAS:');
  console.log(`   Total tarjetas: ${allSlots.length}`);
  console.log(`   Clasificadas y confirmadas: ${classified.length}`);
  console.log(`   Duplicadas ABIERTO/mixto: ${duplicates.length}`);
  console.log(`   ✅ ¿Sistema funcionando? ${classified.length === duplicates.length ? 'SÍ' : 'NO'}`);
}

testMultipleBookings()
  .then(() => {
    console.log('\n✅ Prueba completada');
    prisma.$disconnect();
  })
  .catch(error => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
