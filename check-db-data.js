const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const instructors = await prisma.instructor.findMany({ take: 5 });
  const courts = await prisma.court.findMany({ take: 5 });
  
  console.log('Instructores:', instructors.map(i => i.id));
  console.log('Pistas:', courts.map(c => ({ id: c.id, number: c.number, clubId: c.clubId })));
  
  await prisma.$disconnect();
})();
