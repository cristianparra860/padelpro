const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyLevelRanges() {
  try {
    console.log('\n📊 VERIFICANDO RANGOS DE NIVEL EN BASE DE DATOS\n');

    const totalProposals = await prisma.timeSlot.count({
      where: { courtId: null }
    });

    console.log(`✅ Total propuestas: ${totalProposals}\n`);

    // Muestras con rangos
    const withRanges = await prisma.timeSlot.findMany({
      where: { 
        courtId: null,
        levelRange: { not: null }
      },
      take: 10,
      orderBy: { start: 'asc' },
      include: { instructor: true }
    });

    console.log('🎯 PROPUESTAS CON RANGOS:\n');
    withRanges.forEach((slot, i) => {
      const date = new Date(slot.start);
      console.log(`${i+1}. ${slot.instructor.name} - Rango: ${slot.levelRange} - ${date.toLocaleString('es-ES', {timeZone: 'UTC'})}`);
    });

    // Muestras sin rangos (Abierto)
    const withoutRanges = await prisma.timeSlot.findMany({
      where: { 
        courtId: null,
        levelRange: null
      },
      take: 5,
      orderBy: { start: 'asc' },
      include: { instructor: true }
    });

    console.log('\n⚪ PROPUESTAS SIN RANGO (Abierto):\n');
    withoutRanges.forEach((slot, i) => {
      const date = new Date(slot.start);
      console.log(`${i+1}. ${slot.instructor.name} - Rango: Abierto - ${date.toLocaleString('es-ES', {timeZone: 'UTC'})}`);
    });

    // Estadísticas por instructor
    const instructorStats = await prisma.$queryRaw`
      SELECT i.name, 
             COUNT(t.id) as total_proposals,
             SUM(CASE WHEN t.levelRange IS NOT NULL THEN 1 ELSE 0 END) as with_ranges
      FROM Instructor i
      LEFT JOIN TimeSlot t ON t.instructorId = i.id AND t.courtId IS NULL
      GROUP BY i.id, i.name
      ORDER BY total_proposals DESC
    `;

    console.log('\n📈 ESTADÍSTICAS POR INSTRUCTOR:\n');
    instructorStats.forEach(stat => {
      console.log(`${stat.name}: ${stat.total_proposals} propuestas (${stat.with_ranges} con rango, ${stat.total_proposals - stat.with_ranges} sin rango)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLevelRanges();
