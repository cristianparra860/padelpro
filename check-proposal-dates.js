const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatesWithProposals() {
  console.log('  Verificando fechas con propuestas...\n');
  
  const proposals = await prisma.timeSlot.findMany({
    where: { courtNumber: null },
    select: { start: true, instructorId: true },
    orderBy: { start: 'asc' },
    take: 20
  });
  
  console.log(' Primeras 20 propuestas:\n');
  
  const dateCount = {};
  proposals.forEach(p => {
    const date = new Date(p.start);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
    
    if (!dateCount[dateStr]) {
      dateCount[dateStr] = 0;
    }
    dateCount[dateStr]++;
    
    console.log(`  ${dateStr} ${timeStr} - ${p.instructorId}`);
  });
  
  console.log('\n Resumen por fecha:');
  Object.entries(dateCount).forEach(([date, count]) => {
    console.log(`  ${date}: ${count} propuestas mostradas`);
  });
  
  // Contar total por día
  const allByDate = await prisma.$queryRawUnsafe(`
    SELECT DATE(start) as fecha, COUNT(*) as total
    FROM TimeSlot
    WHERE courtNumber IS NULL
    GROUP BY DATE(start)
    ORDER BY fecha
    LIMIT 10
  `);
  
  console.log('\n Total de propuestas por día (primeros 10 días):');
  allByDate.forEach(row => {
    console.log(`  ${row.fecha}: ${row.total} propuestas`);
  });
  
  await prisma.$disconnect();
}

checkDatesWithProposals();
