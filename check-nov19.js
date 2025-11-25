const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNov19() {
  console.log('=== DIAGNÓSTICO DÍA 19 NOV ===\n');
  
  // 1. Contar propuestas del día 19
  const total = await prisma.timeSlot.count({
    where: {
      start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') },
      courtId: null
    }
  });
  
  console.log(`Total propuestas día 19: ${total}\n`);
  
  // 2. Ver propuestas con bookings
  const withBookings = await prisma.timeSlot.findMany({
    where: {
      start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') },
      courtId: null,
      bookings: { some: {} }
    },
    include: {
      bookings: { select: { groupSize: true, status: true } },
      instructor: { select: { name: true } }
    },
    orderBy: { start: 'asc' }
  });
  
  console.log(`Propuestas con bookings: ${withBookings.length}\n`);
  
  withBookings.forEach(cls => {
    const date = new Date(cls.start);
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    const totalPlayers = cls.bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    
    console.log(`${hourLocal} - ${cls.instructor?.name}`);
    console.log(`  Bookings: ${cls.bookings.length}, Total players: ${totalPlayers}`);
    cls.bookings.forEach(b => {
      console.log(`    groupSize: ${b.groupSize}, status: ${b.status}`);
    });
    console.log('');
  });
  
  // 3. Verificar si faltan clases
  const hoursCount = await prisma.$queryRaw`
    SELECT 
      strftime('%H:%M', start) as hora,
      COUNT(*) as cantidad
    FROM TimeSlot
    WHERE date(start) = '2025-11-19'
    AND courtId IS NULL
    GROUP BY hora
    ORDER BY hora
  `;
  
  console.log('\n=== CLASES POR HORA (día 19) ===\n');
  hoursCount.forEach(row => {
    const hourUTC = row.hora;
    const hourLocal = (parseInt(hourUTC.split(':')[0]) + 1) + ':' + hourUTC.split(':')[1];
    console.log(`${hourLocal} local (${hourUTC} UTC): ${row.cantidad} clases`);
  });
  
  await prisma.$disconnect();
}

checkNov19();
