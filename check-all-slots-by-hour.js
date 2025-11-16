const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const slots = await prisma.timeSlot.findMany({
      where: { 
        clubId: 'club-1',
        start: {
          gte: today.toISOString(),
          lt: tomorrow.toISOString()
        }
      },
      orderBy: { start: 'asc' }
    });

    console.log(`\n📊 Total clases HOY (${today.toLocaleDateString('es-ES')}): ${slots.length}\n`);
    
    const withCourt = slots.filter(s => s.courtId !== null);
    const withoutCourt = slots.filter(s => s.courtId === null);
    
    console.log(`✅ Con pista asignada (courtId != null): ${withCourt.length}`);
    console.log(`🟠 Sin pista asignada (courtId = null): ${withoutCourt.length}\n`);
    
    // Agrupar por hora
    const byHour = {};
    slots.forEach(s => {
      const d = new Date(s.start);
      const hour = d.getHours();
      if (!byHour[hour]) byHour[hour] = { total: 0, conPista: 0, sinPista: 0 };
      byHour[hour].total++;
      if (s.courtId !== null) byHour[hour].conPista++;
      else byHour[hour].sinPista++;
    });

    console.log('Distribución por hora:');
    Object.keys(byHour).sort((a, b) => parseInt(a) - parseInt(b)).forEach(hour => {
      const h = byHour[hour];
      console.log(`  ${hour.toString().padStart(2, '0')}:00 → Total: ${h.total}, Con pista: ${h.conPista}, Sin pista: ${h.sinPista}`);
    });

    // Mostrar primeras 10 clases
    console.log('\n📋 Primeras 10 clases del día:');
    slots.slice(0, 10).forEach(s => {
      const d = new Date(s.start);
      const hour = d.getHours();
      const minute = d.getMinutes();
      console.log(`  ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} - Pista: ${s.courtNumber || 'NULL'} - Instructor: ${s.instructorId?.substring(0, 20)}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
