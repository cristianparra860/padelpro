const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('=== INVESTIGANDO CLASES CON 4 JUGADORES ===\n');
  
  // Buscar clases con bookings
  const classesWithBookings = await prisma.timeSlot.findMany({
    where: {
      courtId: null,
      bookings: { some: {} }
    },
    include: {
      bookings: {
        select: {
          id: true,
          groupSize: true,
          status: true,
          userId: true
        }
      },
      instructor: {
        select: { name: true }
      }
    },
    orderBy: { start: 'asc' }
  });
  
  console.log(`Total clases con bookings: ${classesWithBookings.length}\n`);
  
  classesWithBookings.forEach(cls => {
    const date = new Date(cls.start);
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    const totalPlayers = cls.bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    
    console.log(`${date.toISOString().split('T')[0]} ${hourLocal} - ${cls.instructor?.name}`);
    console.log(`  Total players: ${totalPlayers}`);
    console.log(`  Bookings (${cls.bookings.length}):`);
    cls.bookings.forEach(b => {
      console.log(`    - groupSize: ${b.groupSize}, status: ${b.status}, userId: ${b.userId}`);
    });
    console.log('');
  });
  
  // Verificar si hay clases después de 21:30
  console.log('\n=== VERIFICANDO CLASES FUERA DE HORARIO (después 21:30 local) ===\n');
  
  const lateClasses = await prisma.timeSlot.findMany({
    where: {
      courtId: null,
      start: { gte: new Date('2025-11-19T00:00:00.000Z') }
    },
    orderBy: { start: 'desc' },
    take: 20
  });
  
  lateClasses.forEach(cls => {
    const date = new Date(cls.start);
    const hourUTC = date.getUTCHours();
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    
    if (hourUTC > 20 || (hourUTC === 20 && date.getUTCMinutes() > 30)) {
      console.log(`  ${date.toISOString()} = ${hourLocal} local (FUERA DE HORARIO)`);
    }
  });
  
  await prisma.$disconnect();
}

debug();
