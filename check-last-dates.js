const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const slots = await prisma.$queryRaw`
      SELECT start FROM TimeSlot 
      ORDER BY start DESC 
      LIMIT 10
    `;
    
    console.log('🗓️ Últimas 10 fechas en la DB:');
    slots.forEach((s, i) => {
      const date = new Date(Number(s.start));
      console.log(`${i+1}. ${date.toISOString()} (${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES')})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
