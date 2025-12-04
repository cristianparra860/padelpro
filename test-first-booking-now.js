const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBooking() {
  console.log('\n🧪 SIMULANDO PRIMERA RESERVA...\n');

  const timeSlotId = 'ts-1764308191576-ckdaeugsvsh';
  
  // 1. Verificar estado inicial
  console.log('📊 Estado ANTES de la reserva:');
  const before = await prisma.$queryRaw`
    SELECT id, level, levelRange, genderCategory 
    FROM TimeSlot 
    WHERE id = ${timeSlotId}
  `;
  console.log(before[0]);
  
  // 2. Obtener información del usuario
  const userInfo = await prisma.$queryRaw`
    SELECT id, name, email, gender, level FROM User WHERE gender IS NOT NULL LIMIT 1
  `;
  
  if (userInfo.length === 0) {
    console.log('\n❌ No hay usuarios con género definido.');
    await prisma.$disconnect();
    return;
  }
  
  const user = userInfo[0];
  console.log(`\n👤 Usuario: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Género: ${user.gender}`);
  console.log(`   Nivel: ${user.level}`);
  
  // 3. Obtener rangos del instructor
  const slotInfo = await prisma.$queryRaw`
    SELECT ts.*, i.name as instructorName, i.levelRanges
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON i.id = ts.instructorId
    WHERE ts.id = ${timeSlotId}
  `;
  
  const slot = slotInfo[0];
  console.log(`\n🎾 Clase:`);
  console.log(`   Instructor: ${slot.instructorName}`);
  console.log(`   Fecha: ${new Date(Number(slot.start)).toLocaleString('es-ES')}`);
  
  // 4. Determinar rango de nivel (copiando la lógica de book/route.ts)
  const userLevelStr = user.level;
  const userLevel = userLevelStr === 'principiante' ? 1.0 : 
                    userLevelStr === 'intermedio' ? 3.0 : 
                    userLevelStr === 'avanzado' ? 5.0 : 
                    parseFloat(userLevelStr);
  
  let assignedRange = 'ABIERTO';
  
  if (slot.levelRanges) {
    const ranges = JSON.parse(slot.levelRanges);
    console.log(`\n📊 Rangos del instructor:`, ranges);
    
    // Función findLevelRange del código
    const foundRange = ranges.find(r => userLevel >= r.minLevel && userLevel <= r.maxLevel);
    if (foundRange) {
      assignedRange = `${foundRange.minLevel}-${foundRange.maxLevel}`;
      console.log(`\n🎯 Usuario nivel ${userLevel} → Rango asignado: ${assignedRange}`);
    } else {
      console.log(`\n⚠️ Usuario nivel ${userLevel} no encaja en ningún rango - usando ABIERTO`);
    }
  }
  
  // 5. Determinar categoría de género
  const genderCategory = user.gender === 'masculino' ? 'masculino' : 
                        user.gender === 'femenino' ? 'femenino' : 
                        'mixto';
  
  console.log(`\n🏷️ Categoría asignada: ${genderCategory.toUpperCase()}`);
  console.log(`🏷️ Nivel asignado: ${assignedRange}`);
  
  // 6. Crear la reserva
  const bookingId = `booking-test-${Date.now()}`;
  const now = Date.now();
  await prisma.$executeRaw`
    INSERT INTO Booking (id, userId, timeSlotId, groupSize, createdAt, updatedAt)
    VALUES (${bookingId}, ${user.id}, ${timeSlotId}, 1, ${now}, ${now})
  `;
  
  console.log(`\n✅ Reserva creada: ${bookingId}`);
  
  // 7. Actualizar el TimeSlot (simulando el código de book/route.ts)
  await prisma.$executeRaw`
    UPDATE TimeSlot 
    SET level = ${assignedRange},
        levelRange = ${assignedRange},
        genderCategory = ${genderCategory}
    WHERE id = ${timeSlotId}
  `;
  
  console.log(`✅ TimeSlot actualizado`);
  
  // 8. Verificar estado final
  console.log('\n📊 Estado DESPUÉS de la reserva:');
  const after = await prisma.$queryRaw`
    SELECT id, level, levelRange, genderCategory 
    FROM TimeSlot 
    WHERE id = ${timeSlotId}
  `;
  console.log(after[0]);
  
  // 9. Verificar reservas
  const bookings = await prisma.$queryRaw`
    SELECT b.*, u.name as userName
    FROM Booking b
    LEFT JOIN User u ON u.id = b.userId
    WHERE b.timeSlotId = ${timeSlotId}
  `;
  
  console.log(`\n📋 Reservas en esta clase: ${bookings.length}`);
  bookings.forEach(b => console.log(`   - ${b.userName} (groupSize: ${b.groupSize})`));
  
  console.log('\n✅ ¡PRUEBA COMPLETADA EXITOSAMENTE!');
  console.log('\n🎯 RESULTADO:');
  console.log(`   - Level asignado: "${after[0].level}"`);
  console.log(`   - LevelRange asignado: "${after[0].levelRange}"`);
  console.log(`   - GenderCategory asignado: "${after[0].genderCategory}"`);
  console.log(`   - Primera reserva determina la categoría: ✓`);
  
  await prisma.$disconnect();
}

testBooking().catch(e => {
  console.error('❌ Error:', e.message);
  prisma.$disconnect();
});
