const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const total = await prisma.timeSlot.count();
    const sinPista = await prisma.timeSlot.count({ where: { courtNumber: null } });
    const conPista = await prisma.timeSlot.count({ where: { courtNumber: { not: null } } });
    
    console.log('📊 TimeSlots en DB:');
    console.log('  Total:', total);
    console.log('  Sin pista asignada (propuestas):', sinPista);
    console.log('  Con pista asignada (confirmadas):', conPista);
    
    if (sinPista > 0) {
      const samples = await prisma.timeSlot.findMany({
        where: { courtNumber: null },
        take: 5,
        orderBy: { start: 'asc' },
        select: { id: true, start: true, end: true, level: true, courtNumber: true }
      });
      
      console.log('\n🔸 Primeras 5 propuestas:');
      samples.forEach(s => {
        const startDate = new Date(s.start);
        console.log('  -', startDate.toLocaleString('es-ES'), s.level, 'courtNumber:', s.courtNumber);
      });
    }
    
    // Verificar rango de fechas
    const now = new Date();
    const futureMonth = new Date(now.getTime() + 30*24*60*60*1000);
    now.setHours(0,0,0,0);
    futureMonth.setHours(23,59,59,999);
    
    const inRange = await prisma.timeSlot.count({
      where: {
        start: {
          gte: now,
          lte: futureMonth
        }
      }
    });
    
    console.log('\n📅 TimeSlots en próximos 30 días:', inRange);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
