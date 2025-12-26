const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatches() {
  try {
    const count = await prisma.matchGame.count();
    console.log('📊 Total MatchGames en BD:', count);
    
    const matches = await prisma.matchGame.findMany({
      take: 5,
      select: {
        id: true,
        start: true,
        end: true,
        courtNumber: true,
        level: true,
        isOpen: true,
        genderCategory: true,
        clubId: true
      },
      orderBy: { start: 'asc' }
    });
    
    console.log('\n🎮 Sample matches:');
    matches.forEach(m => {
      const startDate = new Date(m.start);
      console.log(`- ${m.id}: ${startDate.toLocaleString()} | Court: ${m.courtNumber || 'Sin asignar'} | Level: ${m.level} | Open: ${m.isOpen}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMatches();
