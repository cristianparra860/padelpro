const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClassDuration() {
  try {
    console.log('🔍 Verificando duración de clases confirmadas...\n');

    // Obtener clases confirmadas del 19 de noviembre
    const confirmedClasses = await prisma.$queryRaw`
      SELECT 
        id,
        datetime(start / 1000, 'unixepoch', 'localtime') as startTime,
        datetime(end / 1000, 'unixepoch', 'localtime') as endTime,
        CAST((end - start) / (1000 * 60) AS INTEGER) as durationMin,
        courtId,
        instructorId
      FROM TimeSlot
      WHERE DATE(datetime(start / 1000, 'unixepoch', 'localtime')) = '2025-11-19'
        AND courtId IS NOT NULL
    `;

    if (confirmedClasses.length === 0) {
      console.log('❌ No hay clases confirmadas para Nov 19');
      return;
    }

    console.log(`✅ Clases confirmadas: ${confirmedClasses.length}\n`);
    
    for (const cls of confirmedClasses) {
      console.log(`📅 Clase ID: ${cls.id}`);
      console.log(`   Inicio: ${cls.startTime}`);
      console.log(`   Fin: ${cls.endTime}`);
      console.log(`   Duración: ${cls.durationMin} minutos`);
      console.log(`   Pista: ${cls.courtId}`);
      console.log(`   Instructor: ${cls.instructorId}`);
      
      if (cls.durationMin !== 60) {
        console.log(`   ⚠️  ATENCIÓN: Duración NO es 60 minutos!`);
      } else {
        console.log(`   ✅ Duración correcta (60 min)`);
      }
      console.log('');
    }

    // Verificar también propuestas (courtId = NULL)
    const proposals = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as count,
        MIN(datetime(start / 1000, 'unixepoch', 'localtime')) as firstSlot,
        MAX(datetime(start / 1000, 'unixepoch', 'localtime')) as lastSlot
      FROM TimeSlot
      WHERE DATE(datetime(start / 1000, 'unixepoch', 'localtime')) = '2025-11-19'
        AND courtId IS NULL
    `;

    console.log('\n📋 Propuestas disponibles:');
    console.log(`   Total: ${proposals[0].count}`);
    console.log(`   Primera: ${proposals[0].firstSlot}`);
    console.log(`   Última: ${proposals[0].lastSlot}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClassDuration();
