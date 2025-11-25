const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar slots del 8 de diciembre
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-12-08T00:00:00.000Z'),
        lte: new Date('2025-12-08T23:59:59.999Z')
      }
    },
    include: {
      bookings: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      },
      instructor: {
        include: {
          user: { select: { name: true } }
        }
      }
    },
    orderBy: { start: 'asc' }
  });

  console.log(`\n📅 TimeSlots del 8 de diciembre: ${slots.length}\n`);

  slots.forEach(slot => {
    const start = new Date(slot.start);
    const hour = start.getHours();
    const minute = start.getMinutes().toString().padStart(2, '0');
    const totalPlayers = slot.bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    const instructorName = slot.instructor?.user?.name || 'Sin instructor';
    
    console.log(`⏰ ${hour}:${minute} - ${instructorName}`);
    console.log(`   Total jugadores: ${totalPlayers} (${slot.bookings.length} bookings)`);
    console.log(`   courtId: ${slot.courtId || 'NULL (propuesta)'}`);
    
    slot.bookings.forEach((b, i) => {
      console.log(`   ${i + 1}. Booking ${b.id}: groupSize=${b.groupSize}, status=${b.status}`);
    });
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
