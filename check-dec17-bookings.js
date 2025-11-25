const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDec17() {
  // Buscar bookings para el 17 de diciembre
  const bookings = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: {
          gte: new Date('2025-12-17T00:00:00.000Z'),
          lt: new Date('2025-12-18T00:00:00.000Z')
        }
      },
      status: { not: 'CANCELLED' }
    },
    include: {
      user: { select: { name: true } },
      timeSlot: { select: { id: true, start: true, level: true, courtId: true } }
    }
  });
  
  console.log('Bookings for Dec 17:', bookings.length);
  bookings.forEach(b => {
    console.log(`  User: ${b.user.name}`);
    console.log(`  TimeSlot: ${b.timeSlotId.substring(0, 20)}...`);
    console.log(`  Start: ${b.timeSlot.start}`);
    console.log(`  Level: ${b.timeSlot.level}`);
    console.log(`  Court: ${b.timeSlot.courtId || 'null (proposal)'}`);
    console.log(`  Status: ${b.status}`);
    console.log(`  GroupSize: ${b.groupSize}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkDec17();
