const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addStandardLevelRanges() {
  try {
    console.log('🎯 Añadiendo rangos de nivel estándar a todos los instructores...\n');

    // Rangos estándar
    const standardRanges = [
      { minLevel: 1.0, maxLevel: 3.0 },
      { minLevel: 3.0, maxLevel: 5.0 },
      { minLevel: 5.0, maxLevel: 7.0 }
    ];

    const rangesJSON = JSON.stringify(standardRanges);
    console.log('📊 Rangos estándar:', rangesJSON);
    console.log('   - 1.0-3.0 (Principiantes)');
    console.log('   - 3.0-5.0 (Intermedios)');
    console.log('   - 5.0-7.0 (Avanzados)\n');

    // Obtener todos los instructores
    const instructors = await prisma.instructor.findMany({
      select: {
        id: true,
        name: true,
        levelRanges: true
      }
    });

    console.log(`📋 Total de instructores encontrados: ${instructors.length}\n`);

    let updated = 0;
    let skipped = 0;

    // Actualizar cada instructor
    for (const instructor of instructors) {
      if (instructor.levelRanges && instructor.levelRanges !== null) {
        console.log(`⏭️  ${instructor.name} - Ya tiene rangos configurados, saltando...`);
        skipped++;
      } else {
        await prisma.instructor.update({
          where: { id: instructor.id },
          data: { levelRanges: rangesJSON }
        });
        console.log(`✅ ${instructor.name} - Rangos asignados`);
        updated++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Proceso completado:`);
    console.log(`   - Instructores actualizados: ${updated}`);
    console.log(`   - Instructores saltados (ya tenían rangos): ${skipped}`);
    console.log(`   - Total procesados: ${instructors.length}`);
    console.log('='.repeat(50));

    // Verificar resultados
    console.log('\n🔍 Verificando cambios...\n');
    const verifyInstructors = await prisma.instructor.findMany({
      select: {
        name: true,
        levelRanges: true
      }
    });

    verifyInstructors.forEach(instructor => {
      const ranges = instructor.levelRanges ? JSON.parse(instructor.levelRanges) : null;
      console.log(`   ${instructor.name}:`);
      if (ranges) {
        ranges.forEach(r => {
          console.log(`      - ${r.minLevel}-${r.maxLevel}`);
        });
      } else {
        console.log(`      - Sin rangos`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addStandardLevelRanges();
