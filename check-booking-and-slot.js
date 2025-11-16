const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingAndSlot() {
  const booking = await prisma.booking.findUnique({
    where: { id: 'booking-1762875992163-jbkvohdj2' },
    include: { timeSlot: true }
  });

  console.log('\n📋 Booking cancelado:\n');
  console.log(JSON.stringify(booking, null, 2));

  await prisma.$disconnect();
}

checkBookingAndSlot();
