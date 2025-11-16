const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalendarData() {
  try {
    console.log('🔍 Verificando datos del calendario para el 10 de noviembre...\n');

    const clubId = 'padel-estrella-madrid';
    const date = new Date('2025-11-10T00:00:00');
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    // Propuestas (como en la API real)
    const proposals = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.instructorId,
        i.name as instructorName
      FROM TimeSlot t
      LEFT JOIN Instructor i ON t.instructorId = i.id
      WHERE t.clubId = ?
        AND t.start >= ?
        AND t.start <= ?
        AND t.courtId IS NULL
      ORDER BY t.start
    `, clubId, startTimestamp, endTimestamp);

    console.log(`📊 Total propuestas: ${proposals.length}\n`);

    // Agrupar por instructor y hora
    const anaProposals = proposals.filter(p => p.instructorName && p.instructorName.includes('Ana'));
    
    console.log(`👤 Propuestas de Ana: ${anaProposals.length}\n`);
    
    // Mostrar las primeras 10
    const first10 = anaProposals.slice(0, 10);
    first10.forEach(p => {
      const start = new Date(Number(p.start));
      console.log(`   ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
    });

    // Verificar específicamente 08:30
    const has0830 = anaProposals.some(p => {
      const start = new Date(Number(p.start));
      return start.getHours() === 8 && start.getMinutes() === 30;
    });

    console.log(`\n❓ ¿Tiene propuesta a las 08:30? ${has0830 ? '✅ SÍ' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalendarData();
