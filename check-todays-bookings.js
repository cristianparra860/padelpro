const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingsToday() {
  console.log('\n🔍 Verificando reservas del 4 de diciembre de 2025...\n');

  const today = new Date('2025-12-04');
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).getTime();

  // 1. Ver todas las clases de hoy
  const slots = await prisma.$queryRaw`
    SELECT id, start, instructorId, level, levelRange, genderCategory, courtId
    FROM TimeSlot
    WHERE start >= ${startOfDay} AND start <= ${endOfDay}
    AND courtId IS NULL
    ORDER BY start
    LIMIT 10
  `;

  console.log(`📅 Clases disponibles hoy (courtId = NULL): ${slots.length}\n`);

  for (const slot of slots) {
    const slotDate = new Date(Number(slot.start));
    
    // Obtener bookings de esta clase
    const bookings = await prisma.$queryRaw`
      SELECT b.id, b.userId, b.groupSize, b.status, b.createdAt,
             u.name as userName, u.email
      FROM Booking b
      LEFT JOIN User u ON u.id = b.userId
      WHERE b.timeSlotId = ${slot.id}
    `;

    console.log(`🎾 Clase ${slot.id.substring(0, 15)}...`);
    console.log(`   Hora: ${slotDate.toLocaleTimeString('es-ES')}`);
    console.log(`   Level: "${slot.level}"`);
    console.log(`   Gender: "${slot.genderCategory}"`);
    console.log(`   Reservas: ${bookings.length}`);
    
    if (bookings.length > 0) {
      bookings.forEach((b, i) => {
        console.log(`      ${i + 1}. ${b.userName} (${b.email}) - Size: ${b.groupSize}, Status: ${b.status}`);
      });
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkBookingsToday().catch(e => {
  console.error('❌ Error:', e.message);
  prisma.$disconnect();
});
