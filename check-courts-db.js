const { prisma } = require('./src/lib/prisma');

async function checkCourts() {
  const courts = await prisma.court.findMany();
  console.log(`📊 Pistas en BD: ${courts.length}\n`);
  courts.forEach(c => console.log(`  #${c.number}: ${c.name || 'Sin nombre'}`));
  await prisma.$disconnect();
}

checkCourts();
