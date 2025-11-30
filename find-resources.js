const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findResources() {
  const instructors = await prisma.instructor.findMany({
    where: { clubId: 'padel-estrella-madrid' },
    take: 1
  });
  
  const courts = await prisma.court.findFirst({
    where: { clubId: 'padel-estrella-madrid' }
  });
  
  console.log('Instructor:', instructors[0]?.id || 'NO FOUND');
  console.log('Court:', courts?.id || 'NO FOUND');
  
  await prisma.$disconnect();
}

findResources();
