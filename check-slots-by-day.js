const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNextDays() {
  console.log('📅 Verificando slots por día (próximos 7 días)\n');
  
  const clubId = 'padel-estrella-madrid';
  const today = new Date('2025-11-24');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const startOfDay = new Date(date.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const endOfDay = new Date(date.toISOString().split('T')[0] + 'T23:59:59.999Z');
    
    const count = await prisma.timeSlot.count({
      where: {
        clubId,
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    const dateStr = date.toISOString().split('T')[0];
    console.log(`   ${dateStr}: ${count} slots`);
  }
  
  await prisma.$disconnect();
}

checkNextDays();
