const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLateReservations() {
  console.log('🔍 Verificando reservas después de las 21:30...\n');

  // Buscar TimeSlots confirmados (con courtId) después de las 21:30
  const lateClasses = await prisma.$queryRaw`
    SELECT 
      id,
      datetime(start/1000, 'unixepoch', 'localtime') as startTime,
      datetime(end/1000, 'unixepoch', 'localtime') as endTime,
      courtId,
      instructorId,
      level
    FROM TimeSlot
    WHERE courtId IS NOT NULL
    AND time(start/1000, 'unixepoch', 'localtime') >= '21:30:00'
    ORDER BY start DESC
    LIMIT 10
  `;

  console.log(`📚 Clases confirmadas después de 21:30: ${lateClasses.length}`);
  if (lateClasses.length > 0) {
    console.log('Primera clase tarde:');
    console.log(JSON.stringify(lateClasses[0], null, 2));
  }

  // Buscar MatchGames después de las 21:30
  const lateMatches = await prisma.$queryRaw`
    SELECT 
      id,
      datetime(start/1000, 'unixepoch', 'localtime') as startTime,
      datetime(end/1000, 'unixepoch', 'localtime') as endTime,
      courtNumber,
      level,
      genderCategory
    FROM MatchGame
    WHERE time(start/1000, 'unixepoch', 'localtime') >= '21:30:00'
    ORDER BY start DESC
    LIMIT 10
  `;

  console.log(`\n🎾 Partidas después de 21:30: ${lateMatches.length}`);
  if (lateMatches.length > 0) {
    console.log('Primera partida tarde:');
    console.log(JSON.stringify(lateMatches[0], null, 2));
  }

  // Buscar TimeSlots propuestos (sin courtId) después de las 21:30
  const lateProposals = await prisma.$queryRaw`
    SELECT 
      id,
      datetime(start/1000, 'unixepoch', 'localtime') as startTime,
      datetime(end/1000, 'unixepoch', 'localtime') as endTime,
      instructorId,
      level,
      levelRange
    FROM TimeSlot
    WHERE courtId IS NULL
    AND time(start/1000, 'unixepoch', 'localtime') >= '21:30:00'
    ORDER BY start DESC
    LIMIT 10
  `;

  console.log(`\n💡 Propuestas de clases después de 21:30: ${lateProposals.length}`);
  if (lateProposals.length > 0) {
    console.log('Primera propuesta tarde:');
    console.log(JSON.stringify(lateProposals[0], null, 2));
  }

  // Verificar horarios disponibles en las próximas 24 horas
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const allToday = await prisma.$queryRaw`
    SELECT 
      time(start/1000, 'unixepoch', 'localtime') as hora,
      COUNT(*) as cantidad
    FROM TimeSlot
    WHERE date(start/1000, 'unixepoch', 'localtime') = date('now', 'localtime')
    AND courtId IS NULL
    GROUP BY hora
    ORDER BY hora DESC
    LIMIT 5
  `;

  console.log(`\n⏰ Últimos horarios con propuestas HOY:`);
  allToday.forEach(slot => {
    console.log(`  ${slot.hora}: ${slot.cantidad} propuestas`);
  });

  await prisma.$disconnect();
}

checkLateReservations();
