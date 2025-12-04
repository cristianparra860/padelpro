const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getInstructor() {
  const slot = await prisma.timeSlot.findUnique({
    where: { id: 'ts-1764308189412-z9y4veby1rd' },
    include: { instructor: true }
  });
  console.log('Instructor:', JSON.stringify(slot.instructor, null, 2));
  await prisma.$disconnect();
}

getInstructor();
