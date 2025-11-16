const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllClassDurations() {
  try {
    console.log('🔍 Corrigiendo TODAS las duraciones de clases...\n');

    // Contar cuántas clases tienen duración incorrecta
    const incorrectSlots = await prisma.$queryRaw`
      SELECT 
        id,
        start,
        end,
        CAST((end - start) / (1000 * 60) AS INTEGER) as durationMin
      FROM TimeSlot
      WHERE CAST((end - start) / (1000 * 60) AS INTEGER) != 60
    `;

    console.log(`📊 Clases con duración incorrecta: ${incorrectSlots.length}`);

    if (incorrectSlots.length === 0) {
      console.log('✅ Todas las clases ya tienen 60 minutos de duración');
      return;
    }

    let fixed = 0;
    for (const slot of incorrectSlots) {
      // Calcular el nuevo end correcto (60 minutos después del start)
      const newEnd = Number(slot.start) + (60 * 60 * 1000);
      
      await prisma.$executeRaw`
        UPDATE TimeSlot 
        SET end = ${newEnd}
        WHERE id = ${slot.id}
      `;
      
      fixed++;
      
      if (fixed % 100 === 0) {
        console.log(`   Procesadas: ${fixed}/${incorrectSlots.length}`);
      }
    }

    console.log(`\n✅ Corrección completada: ${fixed} clases actualizadas a 60 minutos`);

    // Verificar el resultado
    const verification = await prisma.$queryRaw`
      SELECT 
        CAST((end - start) / (1000 * 60) AS INTEGER) as durationMin,
        COUNT(*) as count
      FROM TimeSlot
      GROUP BY durationMin
      ORDER BY durationMin
    `;

    console.log('\n📊 Distribución de duraciones después de la corrección:');
    verification.forEach(v => {
      console.log(`   ${v.durationMin} min: ${v.count} clases`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllClassDurations();
