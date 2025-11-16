const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const sample = await prisma.timeSlot.findFirst({
    where: { courtNumber: null },
    select: { id: true, start: true }
  });
  
  console.log('Sample start value:', sample?.start);
  console.log('Type:', typeof sample?.start);
  console.log('As Date:', new Date(sample?.start));
  console.log('Now:', new Date());
  console.log('Is future?:', new Date(sample?.start) > new Date());
  
  await prisma.$disconnect();
})();
