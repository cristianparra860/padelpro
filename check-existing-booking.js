const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExistingBookings() {
  const bookings = await prisma.booking.findMany({
    where: {
      userId: 'cmhkwi8so0001tggo0bwojrjy',
      timeSlotId: 'cmi3bxmxr01q9tg549djco39l'
    }
  });
  
  console.log(`Reservas existentes para Alex Garcia en slot cmi3bxmxr01q9tg549djco39l: ${bookings.length}`);
  console.log(JSON.stringify(bookings, null, 2));
  
  await prisma.$disconnect();
}

checkExistingBookings();
