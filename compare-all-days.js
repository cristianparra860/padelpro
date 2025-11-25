const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareDays() {
  console.log('=== COMPARACIÓN DE PRIMERA HORA DE CADA DÍA ===\n');
  
  for (let day = 19; day <= 30; day++) {
    const date = `2025-11-${day}`;
    const result = await prisma.$queryRaw`
      SELECT start FROM TimeSlot 
      WHERE date(start) = ${date}
      ORDER BY start
      LIMIT 1
    `;
    
    if (result.length > 0) {
      const startStr = JSON.stringify(result[0].start);
      // Extraer la hora del string JSON
      const match = startStr.match(/T(\d{2}:\d{2})/);
      const firstHour = match ? match[1] : 'N/A';
      console.log(`Nov ${day}: ${firstHour} UTC`);
    } else {
      console.log(`Nov ${day}: Sin clases`);
    }
  }
  
  // Verificar diciembre también
  console.log('\n=== DICIEMBRE ===\n');
  for (let day = 1; day <= 18; day++) {
    const date = `2025-12-${day.toString().padStart(2, '0')}`;
    const result = await prisma.$queryRaw`
      SELECT start FROM TimeSlot 
      WHERE date(start) = ${date}
      ORDER BY start
      LIMIT 1
    `;
    
    if (result.length > 0) {
      const startStr = JSON.stringify(result[0].start);
      const match = startStr.match(/T(\d{2}:\d{2})/);
      const firstHour = match ? match[1] : 'N/A';
      console.log(`Dec ${day.toString().padStart(2, '0')}: ${firstHour} UTC`);
    }
  }
  
  await prisma.$disconnect();
}

compareDays();
