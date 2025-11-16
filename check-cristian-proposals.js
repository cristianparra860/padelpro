const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCristianProposals() {
  try {
    console.log('🔍 Verificando propuestas de Cristian Parra el 14/nov...\n');

    const date = new Date('2025-11-14T00:00:00');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar Cristian
    const cristian = await prisma.instructor.findFirst({
      where: { 
        name: { contains: 'Cristian' }
      }
    });

    if (!cristian) {
      console.log('❌ Cristian no encontrado');
      return;
    }

    console.log(`✅ Cristian ID: ${cristian.id}\n`);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    // Propuestas
    const proposals = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start
      FROM TimeSlot t
      WHERE t.instructorId = ?
        AND t.start >= ?
        AND t.start <= ?
        AND t.courtId IS NULL
      ORDER BY t.start
    `, cristian.id, startTimestamp, endTimestamp);

    console.log(`📊 Propuestas de Cristian: ${proposals.length}\n`);

    // Mostrar desde 14:00 hasta 16:30
    const relevantSlots = proposals.filter(p => {
      const start = new Date(Number(p.start));
      const hour = start.getHours();
      return hour >= 14 && hour <= 16;
    });

    console.log('🕐 Propuestas entre 14:00-17:00:');
    relevantSlots.forEach(p => {
      const start = new Date(Number(p.start));
      console.log(`   ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
    });

    // Verificar específicamente los slots problemáticos
    const has1400 = proposals.some(p => {
      const s = new Date(Number(p.start));
      return s.getHours() === 14 && s.getMinutes() === 0;
    });
    
    const has1430 = proposals.some(p => {
      const s = new Date(Number(p.start));
      return s.getHours() === 14 && s.getMinutes() === 30;
    });
    
    const has1500 = proposals.some(p => {
      const s = new Date(Number(p.start));
      return s.getHours() === 15 && s.getMinutes() === 0;
    });

    console.log(`\n✅ ¿Tiene propuesta a las 14:00? ${has1400 ? 'SÍ' : 'NO ❌'}`);
    console.log(`✅ ¿Tiene propuesta a las 14:30? ${has1430 ? 'SÍ' : 'NO ❌'}`);
    console.log(`✅ ¿Tiene propuesta a las 15:00? ${has1500 ? 'SÍ' : 'NO ❌'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCristianProposals();
