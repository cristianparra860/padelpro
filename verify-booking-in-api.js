const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyBooking() {
  console.log('\n🔍 Verificando la reserva de prueba...\n');

  const testSlotId = 'ts-1764308191576-ckdaeugsvsh';
  
  // 1. Verificar TimeSlot
  const slot = await prisma.$queryRaw`
    SELECT id, level, levelRange, genderCategory, start
    FROM TimeSlot 
    WHERE id = ${testSlotId}
  `;
  
  console.log('📊 TimeSlot en BD:');
  if (slot.length > 0) {
    const s = slot[0];
    console.log(`   ID: ${s.id}`);
    console.log(`   Level: "${s.level}"`);
    console.log(`   LevelRange: "${s.levelRange}"`);
    console.log(`   GenderCategory: "${s.genderCategory}"`);
    console.log(`   Fecha: ${new Date(Number(s.start)).toLocaleString('es-ES')}`);
  } else {
    console.log('   ❌ No encontrado');
  }
  
  // 2. Verificar Bookings
  const bookings = await prisma.$queryRaw`
    SELECT b.*, u.name as userName, u.email, u.level, u.gender
    FROM Booking b
    LEFT JOIN User u ON u.id = b.userId
    WHERE b.timeSlotId = ${testSlotId}
  `;
  
  console.log(`\n📋 Reservas en esta clase: ${bookings.length}`);
  bookings.forEach((b, i) => {
    console.log(`\n   ${i + 1}. Reserva ID: ${b.id}`);
    console.log(`      Usuario: ${b.userName} (${b.email})`);
    console.log(`      Nivel usuario: ${b.level}`);
    console.log(`      Género usuario: ${b.gender}`);
    console.log(`      Group Size: ${b.groupSize}`);
    console.log(`      Status: ${b.status}`);
    console.log(`      Creada: ${new Date(Number(b.createdAt)).toLocaleString('es-ES')}`);
  });
  
  // 3. Simular lo que devolvería el API
  console.log('\n🌐 Lo que debería devolver /api/timeslots:\n');
  
  const apiResponse = {
    ...slot[0],
    bookings: bookings.map(b => ({
      id: b.id,
      userId: b.userId,
      groupSize: b.groupSize,
      status: b.status,
      userName: b.userName,
      userLevel: b.level,
      userGender: b.gender
    }))
  };
  
  console.log(JSON.stringify(apiResponse, null, 2));
  
  await prisma.$disconnect();
}

verifyBooking().catch(e => {
  console.error('❌ Error:', e.message);
  prisma.$disconnect();
});
