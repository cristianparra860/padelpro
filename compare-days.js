const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareDays() {
  // Día que funciona bien (ej: día 20 nov)
  console.log('=== DÍA 20 NOV (funciona bien) ===');
  const nov20 = await prisma.$queryRawUnsafe(`
    SELECT start FROM TimeSlot 
    WHERE date(start) = '2025-11-20'
    ORDER BY start
    LIMIT 5
  `);
  
  nov20.forEach((r, i) => {
    console.log(`${i+1}. ${JSON.stringify(r.start)}`);
  });
  
  console.log('\n=== DÍA 29 NOV (falla - no tiene 07:00) ===');
  const nov29 = await prisma.$queryRawUnsafe(`
    SELECT start FROM TimeSlot 
    WHERE date(start) = '2025-11-29'
    ORDER BY start
    LIMIT 5
  `);
  
  nov29.forEach((r, i) => {
    console.log(`${i+1}. ${JSON.stringify(r.start)}`);
  });
  
  // Verificar cuándo empezó a fallar
  console.log('\n=== COMPARACIÓN DE PRIMERA HORA ===');
  
  for (let day = 19; day <= 30; day++) {
    const date = `2025-11-${day}`;
    const result = await prisma.$queryRaw`
      SELECT start FROM TimeSlot 
      WHERE date(start) = ${date}
      ORDER BY start
      LIMIT 1
    `;
    
    if (result.length > 0) {
      const firstHour = result[0].start.substring(11, 16);
      console.log(`Nov ${day}: Primera clase a las ${firstHour}`);
    } else {
      console.log(`Nov ${day}: Sin clases`);
    }
  }
  
  await prisma.$disconnect();
}

compareDays();
