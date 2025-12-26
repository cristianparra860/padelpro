const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatches() {
  const count = await prisma.matchGame.count();
  console.log(`Total partidas en BD: ${count}`);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayMatches = await prisma.matchGame.count({
    where: {
      start: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }
  });
  
  console.log(`Partidas de hoy: ${todayMatches}`);
  
  await prisma.$disconnect();
}

checkMatches();
