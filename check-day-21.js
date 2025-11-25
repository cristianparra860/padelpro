const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const d21 = new Date('2025-11-21T00:00:00').getTime();
  const d22 = new Date('2025-11-22T00:00:00').getTime();
  
  const slots21 = await prisma.$queryRaw`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN courtId IS NULL THEN 1 ELSE 0 END) as available
    FROM TimeSlot 
    WHERE start >= ${d21} AND start < ${d22} 
    AND clubId = 'padel-estrella-madrid'
  `;
  
  console.log(`📅 21 Nov 2025: ${Number(slots21[0].total)} slots (${Number(slots21[0].available)} disponibles)`);
  
  if (Number(slots21[0].total) === 0) {
    console.log('❌ NO HAY TIMESLOTS para el 21 de noviembre');
  } else if (Number(slots21[0].available) === 0) {
    console.log('⚠️ Todos los slots tienen courtId asignado (están confirmados)');
    console.log('   El frontend solo muestra slots con courtId=NULL');
  }
  
  await prisma.$disconnect();
}

check();
