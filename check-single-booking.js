const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const b = await prisma.booking.findUnique({
    where: { id: 'booking-1765616611954-kw2j4b8bs' },
    select: {
      id: true,
      status: true,
      wasConfirmed: true,
      isRecycled: true,
      timeSlot: {
        select: {
          courtNumber: true
        }
      }
    }
  });
  
  console.log('\n📋 Booking Details:');
  console.log(JSON.stringify(b, null, 2));
  
  await prisma.$disconnect();
})();
