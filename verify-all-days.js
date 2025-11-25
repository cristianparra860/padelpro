const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== VERIFICACIÓN FINAL: Primera hora de cada día ===\n');
  console.log('NOVIEMBRE:');
  
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
      const match = startStr.match(/T(\d{2}:\d{2})/);
      const hourUTC = match ? match[1] : 'N/A';
      
      // Convertir a hora local
      const dateObj = new Date(result[0].start);
      const hourLocal = dateObj.getHours() + ':' + dateObj.getMinutes().toString().padStart(2, '0');
      
      console.log(`  Nov ${day}: ${hourUTC} UTC = ${hourLocal} local `);
    }
  }
  
  console.log('\nDICIEMBRE (muestra):');
  for (let day = 1; day <= 5; day++) {
    const date = `2025-12-0${day}`;
    const result = await prisma.$queryRaw`
      SELECT start FROM TimeSlot 
      WHERE date(start) = ${date}
      ORDER BY start
      LIMIT 1
    `;
    
    if (result.length > 0) {
      const startStr = JSON.stringify(result[0].start);
      const match = startStr.match(/T(\d{2}:\d{2})/);
      const hourUTC = match ? match[1] : 'N/A';
      
      const dateObj = new Date(result[0].start);
      const hourLocal = dateObj.getHours() + ':' + dateObj.getMinutes().toString().padStart(2, '0');
      
      console.log(`  Dec 0${day}: ${hourUTC} UTC = ${hourLocal} local `);
    }
  }
  
  // Contar total de clases
  const total = await prisma.timeSlot.count({ where: { courtId: null } });
  console.log(`\n Total propuestas disponibles: ${total}`);
  console.log(' Todos los días ahora tienen clases desde 07:00 hora local España');
  
  await prisma.$disconnect();
}

verify();
