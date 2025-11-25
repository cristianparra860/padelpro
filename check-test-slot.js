const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlot() {
  const slot = await prisma.timeSlot.findUnique({
    where: { id: 'cmi3bxmxr01q9tg549djco39l' },
    include: {
      instructor: true,
      club: true,
      bookings: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      }
    }
  });
  console.log(JSON.stringify(slot, null, 2));
  await prisma.$disconnect();
}

checkSlot();
