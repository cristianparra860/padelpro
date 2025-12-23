const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupLevelRangesForInstructors() {
  try {
    console.log('🎯 CONFIGURANDO RANGOS DE NIVEL PARA INSTRUCTORES\n');

    // Rangos estándar de pádel
    const standardRanges = [
      { minLevel: 0.0, maxLevel: 1.0 },   // Principiantes
      { minLevel: 1.5, maxLevel: 2.5 },   // Iniciación
      { minLevel: 3.0, maxLevel: 4.5 },   // Intermedio
      { minLevel: 5.0, maxLevel: 7.0 }    // Avanzado
    ];

    const rangesJSON = JSON.stringify(standardRanges);

    // Obtener todos los instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        user: {
          select: { name: true }
        }
      }
    });

    console.log(`📊 Instructores encontrados: ${instructors.length}\n`);

    for (const instructor of instructors) {
      await prisma.instructor.update({
        where: { id: instructor.id },
        data: { levelRanges: rangesJSON }
      });

      console.log(`✅ ${instructor.user.name}: Rangos configurados`);
      console.log(`   ${standardRanges.map(r => `${r.minLevel}-${r.maxLevel}`).join(' | ')}`);
    }

    console.log('\n✅ TODOS LOS INSTRUCTORES CONFIGURADOS\n');
    console.log('📋 Rangos aplicados:');
    console.log('   1. 0.0-1.0 (Principiantes)');
    console.log('   2. 1.5-2.5 (Iniciación)');
    console.log('   3. 3.0-4.5 (Intermedio)');
    console.log('   4. 5.0-7.0 (Avanzado)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupLevelRangesForInstructors();
