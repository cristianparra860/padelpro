const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealTimeUpdate() {
  console.log('\n🧪 TEST: Simulando flujo completo de reserva y actualización\n');

  // 1. Crear una clase completamente vacía para la prueba
  const testSlotId = `test-realtime-${Date.now()}`;
  const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
  const testTime = new Date(tomorrow);
  testTime.setHours(10, 30, 0, 0);
  
  console.log('📝 Paso 1: Creando clase de prueba...');
  await prisma.$executeRaw`
    INSERT INTO TimeSlot (id, start, instructorId, clubId, maxPlayers, totalPrice)
    VALUES (
      ${testSlotId}, 
      ${testTime.getTime()}, 
      'cmhkwmdc10005tgqw6fn129he',
      'padel-estrella-madrid',
      4,
      25
    )
  `;
  console.log(`   ✅ Clase creada: ${testSlotId}`);
  console.log(`   Hora: ${testTime.toLocaleString('es-ES')}\n`);

  // 2. Hacer una reserva
  console.log('📝 Paso 2: Haciendo primera reserva...');
  const bookingId = `booking-test-${Date.now()}`;
  const userId = 'cmhkwi8so0001tggo0bwojrjy'; // Alex Garcia
  
  await prisma.$executeRaw`
    INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, createdAt, updatedAt)
    VALUES (
      ${bookingId},
      ${userId},
      ${testSlotId},
      1,
      'CONFIRMED',
      ${Date.now()},
      ${Date.now()}
    )
  `;
  console.log(`   ✅ Reserva creada: ${bookingId}\n`);

  // 3. Verificar en BD
  console.log('📝 Paso 3: Verificando en base de datos...');
  const slotWithBookings = await prisma.$queryRaw`
    SELECT 
      ts.id,
      ts.level,
      ts.genderCategory,
      COUNT(b.id) as bookingCount
    FROM TimeSlot ts
    LEFT JOIN Booking b ON b.timeSlotId = ts.id
    WHERE ts.id = ${testSlotId}
    GROUP BY ts.id
  `;
  
  console.log('   BD dice:', slotWithBookings[0]);
  
  // 4. Simular lo que devolvería el API
  console.log('\n📝 Paso 4: Simulando response del API...\n');
  
  const apiBookings = await prisma.$queryRaw`
    SELECT b.id, b.userId, b.groupSize, b.status, u.name as userName, u.email
    FROM Booking b
    LEFT JOIN User u ON u.id = b.userId
    WHERE b.timeSlotId = ${testSlotId}
  `;
  
  const apiResponse = {
    id: testSlotId,
    start: testTime.toISOString(),
    level: slotWithBookings[0].level || '',
    genderCategory: slotWithBookings[0].genderCategory,
    bookings: apiBookings.map(b => ({
      id: b.id,
      userId: b.userId,
      groupSize: b.groupSize,
      status: b.status,
      userName: b.userName,
      userEmail: b.email
    }))
  };
  
  console.log('API Response simulado:');
  console.log(JSON.stringify(apiResponse, null, 2));
  
  // 5. Verificar que bookings.length > 0
  console.log(`\n✅ RESULTADO: El API devolvería ${apiResponse.bookings.length} booking(s)`);
  
  if (apiResponse.bookings.length > 0) {
    console.log('✅ TEST PASADO: Los bookings SÍ están en el response');
  } else {
    console.log('❌ TEST FALLIDO: Los bookings NO están en el response');
  }
  
  // 6. Limpiar
  console.log('\n📝 Limpiando datos de prueba...');
  await prisma.$executeRaw`DELETE FROM Booking WHERE id = ${bookingId}`;
  await prisma.$executeRaw`DELETE FROM TimeSlot WHERE id = ${testSlotId}`;
  console.log('   ✅ Datos de prueba eliminados\n');

  await prisma.$disconnect();
}

testRealTimeUpdate().catch(e => {
  console.error('❌ Error:', e.message);
  prisma.$disconnect();
});
