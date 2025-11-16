const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourts() {
  const all = await prisma.court.findMany();
  console.log('Total courts:', all.length);
  all.forEach(c => {
    console.log(`- ${c.name || c.id}`);
    console.log(`  number: ${c.number}`);
    console.log(`  isActive: ${c.isActive}`);
    console.log(`  clubId: ${c.clubId}`);
  });
  await prisma.$disconnect();
}

checkCourts();
