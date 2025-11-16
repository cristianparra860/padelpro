const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDayWithManyClasses() {
  try {
    console.log('🔍 Buscando día con más de 10 clases...\n');
    
    const result = await prisma.$queryRawUnsafe(`
      SELECT 
        DATE(start/1000, 'unixepoch') as day,
        COUNT(*) as count
      FROM TimeSlot
      WHERE clubId = 'padel-estrella-madrid'
      GROUP BY day
      HAVING count > 10
      ORDER BY day ASC
      LIMIT 5
    `);
    
    console.log('📅 Días con más de 10 clases:\n');
    result.forEach((r, i) => {
      console.log(`${i+1}. ${r.day}: ${r.count} clases`);
    });
    
    if (result.length > 0) {
      console.log(`\n💡 Prueba con el día: ${result[0].day}`);
      console.log(`📊 Tiene ${result[0].count} clases (necesitarás hacer scroll para ver más de 10)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findDayWithManyClasses();
