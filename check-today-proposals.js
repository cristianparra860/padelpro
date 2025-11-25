const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToday() {
  const proposals = await prisma.timeSlot.findMany({
    where: {
      clubId: 'padel-estrella-madrid',
      courtId: null,
      start: {
        gte: new Date('2025-11-24T00:00:00Z'),
        lte: new Date('2025-11-24T23:59:59Z')
      }
    },
    include: { instructor: true },
    orderBy: { start: 'asc' }
  });
  
  console.log('📅 DÍA 24 (HOY) - PROPUESTAS:', proposals.length, '\n');
  proposals.forEach(s => {
    const h = new Date(s.start).toISOString().substring(11,16);
    console.log('  -', s.instructor?.name || 'Sin instructor', '|', s.level, '|', s.genderCategory || 'sin cat', '|', h);
  });
  
  await prisma.$disconnect();
}

checkToday();
