const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubAndCourts() {
  try {
    console.log('🔍 Verificando clubs y pistas en BD...\n');
    
    // Buscar todos los clubs
    const clubs = await prisma.club.findMany();
    console.log(`📊 Clubs en BD: ${clubs.length}`);
    clubs.forEach(c => {
      console.log(`  - ${c.name} (ID: ${c.id})`);
    });
    console.log('');

    // Si hay clubs, buscar pistas de cada uno
    for (const club of clubs) {
      const courts = await prisma.court.findMany({
        where: { clubId: club.id }
      });
      console.log(`🏟️ Pistas de ${club.name}: ${courts.length}`);
      courts.forEach(c => {
        console.log(`  #${c.number}: ${c.name || 'Sin nombre'}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClubAndCourts();
