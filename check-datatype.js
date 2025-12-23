const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDataType() {
  const slot = await prisma.timeSlot.findFirst({
    where: { instructorId: 'cmjhhs1k30002tga4zzj2etzc' }
  });
  
  console.log('start:', slot.start);
  console.log('tipo:', typeof slot.start);
  console.log('constructor:', slot.start.constructor.name);
  console.log('valueOf:', slot.start.valueOf ? slot.start.valueOf() : 'N/A');
  
  // Hacer query raw para ver el valor en la BD
  const raw = await prisma.$queryRaw`SELECT start FROM TimeSlot WHERE id = ${slot.id}`;
  console.log('Raw from DB:', raw);
  
  await prisma.$disconnect();
}

checkDataType();
