const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLate() {
  // Buscar clases después de 20:30 UTC
  const lateClasses = await prisma.timeSlot.findMany({
    where: {
      courtId: null,
      start: { gte: new Date('2025-12-17T21:00:00.000Z') }
    },
    include: {
      bookings: { select: { groupSize: true, status: true } },
      instructor: { select: { name: true } }
    },
    orderBy: { start: 'asc' }
  });
  
  console.log(`=== CLASES FUERA DE HORARIO (después 20:30 UTC) ===\n`);
  console.log(`Total encontradas: ${lateClasses.length}\n`);
  
  lateClasses.forEach(cls => {
    const date = new Date(cls.start);
    const hourUTC = date.getUTCHours() + ':' + date.getUTCMinutes().toString().padStart(2, '0');
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    const totalPlayers = cls.bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    
    console.log(`${cls.start}`);
    console.log(`  UTC: ${hourUTC} | Local: ${hourLocal}`);
    console.log(`  Instructor: ${cls.instructor?.name}`);
    console.log(`  Bookings: ${cls.bookings.length} (${totalPlayers} players total)`);
    console.log(`  ID: ${cls.id}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkLate();
