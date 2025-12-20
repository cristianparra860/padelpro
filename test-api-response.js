const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n Simulando llamada al API /api/timeslots...\n');
  
  const timeSlotId = 'ts-1764308203959-18m440tcke';
  
  const timeSlots = await prisma.timeSlot.findMany({
    where: { id: timeSlotId },
    include: {
      instructor: { select: { id: true, name: true, level: true } },
      bookings: {
        where: {
          OR: [
            { status: { in: ['PENDING', 'CONFIRMED'] } },
            { status: 'CANCELLED', isRecycled: true }
          ]
        },
        include: {
          user: {
            select: {
              id: true, name: true, email: true, level: true,
              position: true, profilePictureUrl: true
            }
          }
        }
      }
    }
  });
  
  if (timeSlots.length === 0) {
    console.log(' No se encontró el TimeSlot');
    await prisma.$disconnect();
    return;
  }
  
  const slot = timeSlots[0];
  
  console.log(' TimeSlot:', {
    id: slot.id.substring(0, 20) + '...',
    start: new Date(slot.start),
    courtNumber: slot.courtNumber,
    instructor: slot.instructor?.name,
    totalBookings: slot.bookings.length
  });
  
  console.log('\n Bookings:\n');
  
  if (slot.bookings.length === 0) {
    console.log(' NO HAY BOOKINGS');
  } else {
    slot.bookings.forEach((b, i) => {
      console.log(`${i + 1}. ${b.user.name} - groupSize:${b.groupSize} - status:${b.status} - isRecycled:${b.isRecycled}`);
    });
    
    const recycled = slot.bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled === true);
    console.log(`\n Reciclados: ${recycled.length}`);
  }
  
  await prisma.$disconnect();
})();
