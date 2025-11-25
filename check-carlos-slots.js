const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosSlots() {
  const ts = new Date('2025-11-25T07:00:00').getTime();
  
  const slots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE i.name LIKE '%Carlos%' AND ts.start = ${ts}
    ORDER BY ts.level, ts.genderCategory
  `);
  
  console.log('📋 Tarjetas de Carlos Martinez:\n');
  for (const slot of slots) {
    console.log(`Nivel: ${slot.level.padEnd(15)} | Categoría: ${(slot.genderCategory||'N/A').padEnd(10)} | Pista: ${slot.courtNumber || 'N/A'} | Reservas: ${slot.bookingCount}`);
    console.log(`   ID: ${slot.id}`);
    
    // Ver las reservas
    const bookings = await prisma.booking.findMany({
      where: { timeSlotId: slot.id },
      include: { user: { select: { name: true } } }
    });
    
    if (bookings.length > 0) {
      bookings.forEach(b => {
        console.log(`   📌 ${b.user.name} - ${b.status} (groupSize: ${b.groupSize})`);
      });
    }
    console.log();
  }
  
  prisma.$disconnect();
}

checkCarlosSlots();
