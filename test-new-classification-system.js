const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNewClassification() {
  console.log('🧪 PRUEBA DEL NUEVO SISTEMA DE CLASIFICACIÓN\n');
  
  // 1. Buscar usuario Marc Parra
  const marc = await prisma.user.findFirst({
    where: { 
      OR: [
        { name: { contains: 'Marc' } },
        { email: { contains: 'marc' } }
      ]
    }
  });
  
  if (!marc) {
    console.log('❌ Usuario Marc no encontrado');
    return;
  }
  
  console.log(`✅ Usuario: ${marc.name}`);
  console.log(`   Email: ${marc.email}`);
  console.log(`   Nivel: ${marc.level}`);
  console.log(`   Género: ${marc.gender}`);
  console.log(`   Créditos: ${marc.credits}\n`);
  
  // 2. Buscar una clase ABIERTA disponible del día 25 a las 7:00
  const targetDate = new Date('2025-11-25T07:00:00');
  const timestamp = targetDate.getTime();
  
  const availableSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName, c.name as clubName
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    JOIN Club c ON ts.clubId = c.id
    WHERE ts.start = ${timestamp}
    AND ts.courtId IS NULL
    AND ts.level = 'ABIERTO'
    ORDER BY i.name
    LIMIT 1
  `);
  
  if (availableSlots.length === 0) {
    console.log('❌ No hay clases ABIERTO disponibles para probar');
    return;
  }
  
  const slot = availableSlots[0];
  console.log(`📅 Clase seleccionada:`);
  console.log(`   Instructor: ${slot.instructorName}`);
  console.log(`   Club: ${slot.clubName}`);
  console.log(`   Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
  console.log(`   Nivel: ${slot.level} | Categoría: ${slot.genderCategory || 'N/A'}`);
  console.log(`   Precio: €${(slot.totalPrice/100).toFixed(2)}`);
  console.log(`   TimeSlot ID: ${slot.id}\n`);
  
  // 3. Simular la reserva usando fetch API (como lo hace el frontend)
  console.log('📞 Llamando a la API de booking...\n');
  
  const response = await fetch('http://localhost:9002/api/classes/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeSlotId: slot.id,
      userId: marc.id,
      groupSize: 1, // 👈 IMPORTANTE: groupSize=1 para completar la carrera inmediatamente
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.log('❌ Error en la reserva:', result.error || result.message);
    return;
  }
  
  console.log('✅ RESERVA EXITOSA\n');
  console.log('📊 Resultado:', JSON.stringify(result, null, 2));
  
  // 4. Verificar el estado después de la reserva
  console.log('\n🔍 VERIFICACIÓN POST-RESERVA:\n');
  
  // 4a. Verificar que el TimeSlot se clasificó
  const updatedSlot = await prisma.timeSlot.findUnique({
    where: { id: slot.id },
    select: {
      level: true,
      genderCategory: true,
      courtNumber: true,
      _count: {
        select: { bookings: true }
      }
    }
  });
  
  console.log('📋 TimeSlot actualizado:');
  console.log(`   Nivel: ${updatedSlot?.level}`);
  console.log(`   Categoría: ${updatedSlot?.genderCategory}`);
  console.log(`   Pista asignada: ${updatedSlot?.courtNumber || 'N/A'}`);
  console.log(`   Reservas: ${updatedSlot?._count.bookings}\n`);
  
  // 4b. Verificar si se creó la tarjeta duplicada ABIERTA
  const duplicateSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.instructorId = '${slot.instructorId}'
    AND ts.start = ${timestamp}
    AND ts.courtId IS NULL
    AND ts.level = 'ABIERTO'
    AND ts.genderCategory = 'mixto'
  `);
  
  if (duplicateSlots.length > 0) {
    console.log('✅ TARJETA DUPLICADA ABIERTA CREADA:');
    duplicateSlots.forEach(dup => {
      console.log(`   ID: ${dup.id}`);
      console.log(`   Instructor: ${dup.instructorName}`);
      console.log(`   Nivel: ${dup.level} | Categoría: ${dup.genderCategory}`);
    });
  } else {
    console.log('❌ NO se creó la tarjeta duplicada ABIERTA');
  }
  
  // 4c. Mostrar todas las tarjetas de este instructor a esta hora
  console.log(`\n📊 Todas las tarjetas de ${slot.instructorName} a las 7:00:\n`);
  
  const allSlotsForTime = await prisma.$queryRawUnsafe(`
    SELECT ts.id, ts.level, ts.genderCategory, ts.courtId, ts.courtNumber,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    WHERE ts.instructorId = '${slot.instructorId}'
    AND ts.start = ${timestamp}
    ORDER BY ts.level, ts.genderCategory
  `);
  
  allSlotsForTime.forEach((s, i) => {
    console.log(`${i+1}. Nivel: ${s.level.padEnd(15)} | Categoría: ${(s.genderCategory || 'N/A').padEnd(10)} | Pista: ${s.courtNumber || 'N/A'} | Reservas: ${s.bookingCount}`);
  });
  
  console.log(`\n🎯 Total tarjetas: ${allSlotsForTime.length}`);
}

// Ejecutar prueba
testNewClassification()
  .then(() => {
    console.log('\n✅ Prueba completada');
    prisma.$disconnect();
  })
  .catch(error => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
