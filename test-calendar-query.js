const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('\n=== TEST CALENDAR QUERY ===\n');
  
  // Ver hora de las clases primero
  const sample = await prisma.timeSlot.findFirst({
    where: {
      start: {
        gte: new Date('2025-11-01'),
        lt: new Date('2025-12-01')
      }
    },
    select: { start: true, clubId: true }
  });
  
  console.log('Muestra de clase:');
  console.log('  Fecha/Hora:', sample?.start?.toISOString());
  console.log('  ClubId:', sample?.clubId || 'NULL');
  console.log('');
  
  // Query exactamente como lo hace la API
  const clubId = 'club-1';
  const startDate = '2025-11-01T00:00:00.000Z';
  const endDate = '2025-11-30T23:59:59.999Z';
  
  const classes = await prisma.timeSlot.findMany({
    where: {
      ...(clubId && { clubId }),
      start: { 
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    select: {
      id: true,
      start: true,
      clubId: true,
      level: true
    },
    take: 3
  });

  console.log(`Buscando con clubId: ${clubId}`);
  console.log(`Rango: ${startDate} - ${endDate}`);
  console.log(`\nClases encontradas: ${classes.length}`);
  
  if (classes.length === 0) {
    // Intentar sin clubId
    const classesNoClub = await prisma.timeSlot.findMany({
      where: {
        start: { 
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        id: true,
        start: true,
        clubId: true
      },
      take: 5
    });
    
    console.log(`\n❌ Con clubId: 0 clases`);
    console.log(`Sin clubId: ${classesNoClub.length} clases`);
    
    if (classesNoClub.length > 0) {
      console.log('\nClubIds en las clases:');
      const uniqueClubIds = [...new Set(classesNoClub.map(c => c.clubId || 'NULL'))];
      uniqueClubIds.forEach(id => console.log(`  - "${id}"`));
    }
  }
  
  await prisma.$disconnect();
}

test();
