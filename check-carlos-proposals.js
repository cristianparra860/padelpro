const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosProposals() {
  try {
    console.log('🔍 Verificando propuestas de Carlos el 9 de noviembre...\n');

    const date = new Date('2025-11-09T00:00:00');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    // Buscar Carlos
    const carlos = await prisma.instructor.findFirst({
      where: { 
        name: { contains: 'Carlos' }
      }
    });

    if (!carlos) {
      console.log('❌ Carlos no encontrado');
      return;
    }

    console.log(`✅ Carlos ID: ${carlos.id}\n`);

    // Buscar propuestas (courtId = NULL)
    const proposals = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.end
      FROM TimeSlot t
      WHERE t.instructorId = ?
        AND t.start >= ?
        AND t.start <= ?
        AND t.courtId IS NULL
      ORDER BY t.start
      LIMIT 30
    `, carlos.id, startTimestamp, endTimestamp);

    console.log(`📊 Propuestas de Carlos el 9/nov: ${proposals.length}\n`);

    if (proposals.length === 0) {
      console.log('❌ NO HAY PROPUESTAS - Este es el problema!');
      return;
    }

    proposals.forEach(prop => {
      const start = new Date(Number(prop.start));
      console.log(`   ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCarlosProposals();
