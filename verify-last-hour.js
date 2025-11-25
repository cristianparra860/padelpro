const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyLastHour() {
  console.log('=== VERIFICACIÓN: Última hora de cada día ===\n');
  
  // Verificar algunos días de muestra
  const testDays = ['2025-11-20', '2025-11-29', '2025-12-01', '2025-12-18'];
  
  for (const date of testDays) {
    const result = await prisma.$queryRaw`
      SELECT start FROM TimeSlot 
      WHERE date(start) = ${date}
      AND courtId IS NULL
      ORDER BY start DESC
      LIMIT 1
    `;
    
    if (result.length > 0) {
      const startStr = JSON.stringify(result[0].start);
      const match = startStr.match(/T(\d{2}:\d{2})/);
      const hourUTC = match ? match[1] : 'N/A';
      
      const dateObj = new Date(result[0].start);
      const hourLocal = dateObj.getHours() + ':' + dateObj.getMinutes().toString().padStart(2, '0');
      
      console.log(`${date}: Última clase ${hourUTC} UTC = ${hourLocal} local`);
    }
  }
  
  console.log('\n Horario completo: 07:00 - 21:30 hora local España');
  console.log('   (06:00 - 20:30 UTC)');
  
  await prisma.$disconnect();
}

verifyLastHour();
