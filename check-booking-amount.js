const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  const booking = await prisma.booking.findFirst({
    where: { id: 'booking-1762539316486-ky5tdw4x8' }
  });
  
  console.log(JSON.stringify(booking, null, 2));
  await prisma.$disconnect();
}

checkBooking();
