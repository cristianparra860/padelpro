const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Convertir 8 dic a timestamp (milisegundos)
  const startOfDay = new Date('2025-12-08T00:00:00.000Z').getTime();
  const endOfDay = new Date('2025-12-08T23:59:59.999Z').getTime();

  // Query raw SQL porque SQLite guarda como number
  const slots = await prisma.$queryRaw`
    SELECT id, start, end, instructorId, courtId, maxPlayers
    FROM TimeSlot
    WHERE start >= ${startOfDay} AND start <= ${endOfDay}
    ORDER BY start ASC
  `;

  console.log(`\n📅 TimeSlots del 8 de diciembre: ${slots.length}\n`);

  for (const slot of slots) {
    const startDate = new Date(Number(slot.start));
    const hora = `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    
    // Obtener bookings de este slot
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlotId: slot.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    const totalPlayers = bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);

    console.log(`⏰ ${hora} - Slot ${slot.id}`);
    console.log(`   Total jugadores: ${totalPlayers} (${bookings.length} bookings)`);
    console.log(`   CourtId: ${slot.courtId || 'NULL'}`);
    
    bookings.forEach((b, i) => {
      console.log(`   ${i + 1}. Booking ${b.id}: groupSize=${b.groupSize}, status=${b.status}`);
    });
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
