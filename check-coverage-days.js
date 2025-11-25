const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDays() {
  const startDate = new Date('2025-11-17T00:00:00');
  const endDate = new Date('2025-11-30T23:59:59');
  
  console.log('\n📅 VERIFICAR COBERTURA DÍA POR DÍA (17-30 Nov)\n');
  console.log('='.repeat(70));
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStart = d.getTime();
    const dayEnd = new Date(d).setHours(23, 59, 59, 999);
    
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN courtId IS NULL THEN 1 ELSE 0 END) as available
      FROM TimeSlot 
      WHERE start >= ${dayStart} AND start <= ${dayEnd}
      AND clubId = 'padel-estrella-madrid'
    `;
    
    const total = Number(result[0].total);
    const available = Number(result[0].available);
    const status = total > 0 ? '✅' : '❌';
    
    console.log(`${status} ${d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}: ${total} slots (${available} disponibles)`);
  }
  
  await prisma.$disconnect();
}

checkDays();
