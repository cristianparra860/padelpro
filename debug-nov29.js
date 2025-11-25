const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Verificar que se crearon
  const count = await prisma.timeSlot.count({
    where: {
      start: { gte: new Date('2025-11-29T07:00:00.000Z'), lt: new Date('2025-11-29T08:00:00.000Z') }
    }
  });
  
  console.log(`Clases de 07:00-08:00 para 29 nov: ${count}`);
  
  // Verificar todas las horas disponibles
  const all = await prisma.$queryRaw`
    SELECT DISTINCT strftime('%H:%M', start) as hora
    FROM TimeSlot
    WHERE date(start) = '2025-11-29'
    ORDER BY hora
  `;
  
  console.log(`\nTodas las horas del día 29 (${all.length} slots únicos):`);
  all.forEach(h => console.log(`  ${h.hora}`));
  
  await prisma.$disconnect();
}

check();
