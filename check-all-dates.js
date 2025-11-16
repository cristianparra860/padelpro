const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const slots = await prisma.timeSlot.findMany({
      where: { clubId: 'club-1' },
      orderBy: { start: 'asc' },
      take: 100
    });

    console.log(`\n📊 Total clases en DB: ${slots.length}\n`);
    
    if (slots.length > 0) {
      console.log('Primeras 20 clases:');
      slots.slice(0, 20).forEach(s => {
        const d = new Date(s.start);
        console.log(`  ${d.toLocaleString('es-ES')} - Pista: ${s.courtNumber || 'NULL'} - Instructor: ${s.instructorId?.substring(0, 20)}`);
      });

      // Contar por fecha
      const byDate = {};
      slots.forEach(s => {
        const d = new Date(s.start);
        const dateKey = d.toLocaleDateString('es-ES');
        if (!byDate[dateKey]) byDate[dateKey] = { total: 0, conPista: 0, sinPista: 0 };
        byDate[dateKey].total++;
        if (s.courtId !== null) byDate[dateKey].conPista++;
        else byDate[dateKey].sinPista++;
      });

      console.log('\n📅 Clases por fecha:');
      Object.keys(byDate).forEach(date => {
        const d = byDate[date];
        console.log(`  ${date} → Total: ${d.total}, Con pista: ${d.conPista}, Sin pista: ${d.sinPista}`);
      });
    } else {
      console.log('❌ No hay clases en la base de datos');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
