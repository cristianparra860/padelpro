const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: {
          gte: new Date('2025-12-08T15:00:00.000Z'),
          lte: new Date('2025-12-08T18:00:00.999Z')
        }
      },
      status: { in: ['PENDING', 'CONFIRMED'] }
    },
    include: {
      timeSlot: {
        select: {
          id: true,
          start: true,
          instructorId: true,
          courtId: true
        }
      }
    },
    orderBy: {
      timeSlot: {
        start: 'asc'
      }
    }
  });

  console.log(`\n📚 Bookings del 8 dic entre 16-18h: ${bookings.length}\n`);
  
  bookings.forEach(b => {
    const s = new Date(b.timeSlot.start);
    const hora = `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')}`;
    console.log(`📍 TimeSlot ID: ${b.timeSlotId}`);
    console.log(`   Hora: ${hora}`);
    console.log(`   GroupSize: ${b.groupSize}`);
    console.log(`   Status: ${b.status}`);
    console.log(`   CourtId: ${b.timeSlot.courtId || 'NULL'}`);
    console.log('');
  });

  // Agrupar por TimeSlot
  const bySlot = {};
  bookings.forEach(b => {
    if (!bySlot[b.timeSlotId]) bySlot[b.timeSlotId] = [];
    bySlot[b.timeSlotId].push(b);
  });

  console.log(`\n📊 Resumen por TimeSlot:\n`);
  Object.keys(bySlot).forEach(slotId => {
    const bookingsOfSlot = bySlot[slotId];
    const first = bookingsOfSlot[0];
    const s = new Date(first.timeSlot.start);
    const hora = `${s.getHours()}:${s.getMinutes().toString().padStart(2, '0')}`;
    const totalPlayers = bookingsOfSlot.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    
    console.log(`⏰ ${hora} - TimeSlot ${slotId}`);
    console.log(`   Total jugadores: ${totalPlayers} (${bookingsOfSlot.length} bookings)`);
    console.log(`   CourtId: ${first.timeSlot.courtId || 'NULL (propuesta)'}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
