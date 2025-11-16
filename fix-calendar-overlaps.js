// Script para limpiar propuestas DENTRO de clases confirmadas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanProposalsOverlappingConfirmed() {
  try {
    console.log('🧹 Limpiando propuestas dentro de clases confirmadas...\n');
    console.log('📏 REGLA: Las clases pueden ser consecutivas (09:00-10:00, luego 10:00-11:00)\n');

    // 1. Obtener todas las clases confirmadas (tienen courtNumber asignado)
    const confirmedClasses = await prisma.$queryRaw`
      SELECT id, start, end, instructorId, courtNumber
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      ORDER BY start ASC
    `;

    console.log(`✅ Encontradas ${confirmedClasses.length} clases confirmadas\n`);

    let totalDeleted = 0;

    // 2. Para cada clase confirmada, eliminar solo propuestas DENTRO
    for (const confirmedClass of confirmedClasses) {
      const { id, start, end, instructorId, courtNumber } = confirmedClass;
      
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      const classDuration = (endTime - startTime) / (1000 * 60); // minutos

      console.log(`📍 Clase confirmada en Pista ${courtNumber}:`);
      console.log(`   Instructor: ${instructorId}`);
      console.log(`   Horario: ${new Date(start).toLocaleTimeString('es-ES')} - ${new Date(end).toLocaleTimeString('es-ES')} (${classDuration} min)`);

      // Eliminar SOLO propuestas que empiezan ESTRICTAMENTE DENTRO de esta clase
      // NO eliminar la propuesta del inicio (se convirtió a verde)
      // NO eliminar propuestas que empiezan cuando termina o después
      // Ejemplo: Clase 08:00-09:00 → eliminar 08:30 (NO 08:00, NO 09:00, NO 09:30)
      const deleted = await prisma.$executeRaw`
        DELETE FROM TimeSlot
        WHERE instructorId = ${instructorId}
        AND courtId IS NULL
        AND id != ${id}
        AND start > ${start}
        AND start < ${end}
      `;

      if (deleted > 0) {
        console.log(`   🗑️  Eliminadas ${deleted} propuesta(s) dentro de la clase`);
        totalDeleted += deleted;
      } else {
        console.log(`   ✅ Sin propuestas dentro de la clase`);
      }
      console.log('');
    }

    console.log(`\n🎉 Limpieza completada!`);
    console.log(`📊 Total de propuestas eliminadas: ${totalDeleted}`);

    // 3. Mostrar resumen final
    const remainingProposals = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot WHERE courtId IS NULL
    `;
    const confirmedCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot WHERE courtNumber IS NOT NULL
    `;

    console.log(`\n📈 Estado final:`);
    console.log(`   🟠 Propuestas (naranjas): ${remainingProposals[0].count}`);
    console.log(`   🟢 Confirmadas (verdes): ${confirmedCount[0].count}`);
    console.log(`\n💡 Las clases pueden ser consecutivas sin espacios entre ellas`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanProposalsOverlappingConfirmed();
