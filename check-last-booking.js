const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLastBooking() {
  // Ver la última reserva con SQL directo
  const bookings = await prisma.$queryRaw`
    SELECT 
      b.id,
      b.userId,
      b.timeSlotId,
      b.groupSize,
      b.status,
      b.createdAt,
      u.name as userName,
      u.genderCategory as userGender,
      ts.start,
      ts.courtNumber,
      ts.genderCategory as slotGender
    FROM Booking b
    JOIN User u ON b.userId = u.id
    JOIN TimeSlot ts ON b.timeSlotId = ts.id
    ORDER BY b.createdAt DESC
    LIMIT 5
  `;

  console.log('\n📋 Últimas 5 reservas:\n');
  bookings.forEach((b, i) => {
    console.log(`${i + 1}. Booking ID: ${b.id}`);
    console.log(`   Usuario: ${b.userName} (género: ${b.userGender || 'NO DEFINIDO'})`);
    console.log(`   TimeSlot: ${b.timeSlotId}`);
    console.log(`   Hora: ${new Date(b.start).toLocaleString()}`);
    console.log(`   GroupSize: ${b.groupSize}`);
    console.log(`   Pista asignada: ${b.courtNumber || 'SIN ASIGNAR'}`);
    console.log(`   Categoría TimeSlot: ${b.slotGender || 'NO DEFINIDA'}`);
    console.log(`   Status: ${b.status}\n`);
  });

  await prisma.$disconnect();
}

checkLastBooking();
