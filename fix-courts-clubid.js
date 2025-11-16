const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCourtClubIds() {
  console.log(' Actualizando clubId de las pistas...\n');
  
  const updated = await prisma.court.updateMany({
    where: { clubId: 'club-1' },
    data: { clubId: 'club-padel-estrella' }
  });
  
  console.log(` ${updated.count} pistas actualizadas\n`);
  
  // Verificar
  const courts = await prisma.court.findMany({
    where: { clubId: 'club-padel-estrella' }
  });
  
  console.log(' Pistas con clubId correcto:');
  courts.forEach(c => {
    console.log(`- ${c.name}: ${c.clubId}`);
  });
  
  await prisma.$disconnect();
}

fixCourtClubIds();
