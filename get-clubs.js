const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getClubs() {
  const clubs = await prisma.club.findMany();
  console.log('Clubs encontrados:');
  clubs.forEach(club => {
    console.log(`  - ${club.name} (ID: ${club.id})`);
  });
  await prisma.$disconnect();
}

getClubs();
