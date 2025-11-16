const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDurations() {
  try {
    console.log('🔍 Verificando duraciones...\n');

    // Verificar duraciones
    const durations = await prisma.$queryRaw`
      SELECT 
        CAST((CAST(end AS INTEGER) - CAST(start AS INTEGER)) / (1000 * 60) AS INTEGER) as durationMin,
        COUNT(*) as count
      FROM TimeSlot
      GROUP BY durationMin
      ORDER BY durationMin
    `;

    console.log('📊 Distribución de duraciones:');
    durations.forEach(d => {
      const icon = d.durationMin === 60 ? '✅' : '❌';
      console.log(`   ${icon} ${d.durationMin} min: ${d.count} clases`);
    });

    // Verificar una muestra de Nov 19
    const sampleSlots = await prisma.$queryRaw`
      SELECT 
        datetime(CAST(start AS INTEGER) / 1000, 'unixepoch', 'localtime') as startTime,
        datetime(CAST(end AS INTEGER) / 1000, 'unixepoch', 'localtime') as endTime,
        CAST((CAST(end AS INTEGER) - CAST(start AS INTEGER)) / (1000 * 60) AS INTEGER) as durationMin
      FROM TimeSlot
      WHERE DATE(datetime(CAST(start AS INTEGER) / 1000, 'unixepoch', 'localtime')) = '2025-11-19'
      LIMIT 5
    `;

    console.log('\n📅 Muestra de Nov 19, 2025:');
    sampleSlots.forEach(s => {
      console.log(`   ${s.startTime} - ${s.endTime} (${s.durationMin} min)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDurations();
