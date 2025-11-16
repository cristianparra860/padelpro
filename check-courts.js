const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourts() {
  const courts = await prisma.court.findMany({
    where: { clubId: 'club-padel-estrella', isActive: true },
    include: { club: { select: { name: true } } }
  });
  console.log('Courts:', courts.length);
  courts.forEach(c => console.log(`- ${c.name} (${c.number})`));
  await prisma.$disconnect();
}

checkCourts();
