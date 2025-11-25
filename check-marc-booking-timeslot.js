const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  console.log('🔍 Checking Marc Parra booking...\n');
  
  const booking = await prisma.booking.findFirst({
    where: {
      userId: 'user-1763662142824-w26f4jqvb', // Marc Parra
      status: 'CONFIRMED'
    },
    select: {
      id: true,
      timeSlotId: true,
      status: true,
      groupSize: true,
      user: {
        select: {
          name: true
        }
      },
      timeSlot: {
        select: {
          id: true,
          start: true,
          instructorId: true
        }
      }
    }
  });
  
  console.log('📋 Booking de Marc:', JSON.stringify(booking, null, 2));
  
  await prisma.$disconnect();
}

checkBooking();
