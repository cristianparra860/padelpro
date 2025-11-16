// Corregir propuestas que deberían estar eliminadas por clases confirmadas

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBlockedProposals() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 CORRIGIENDO PROPUESTAS QUE DEBERÍAN ESTAR BLOQUEADAS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Obtener todas las clases confirmadas
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: { courtId: { not: null } },
      orderBy: { start: 'asc' }
    });

    console.log(`📊 Clases confirmadas encontradas: ${confirmedClasses.length}\n`);

    let totalDeleted = 0;

    for (const cls of confirmedClasses) {
      const start = new Date(cls.start);
      const end = new Date(cls.end);
      const startISO = cls.start;
      const endISO = cls.end;
      
      console.log(`🔍 Verificando clase ${start.toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${cls.instructorId}`);
      console.log(`   Rango: ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);

      // Buscar propuestas del mismo instructor que empiezan en el rango [start, end)
      const proposalsToDelete = await prisma.$queryRaw`
        SELECT id, start, end FROM TimeSlot
        WHERE instructorId = ${cls.instructorId}
        AND courtId IS NULL
        AND id != ${cls.id}
        AND start >= ${startISO}
        AND start < ${endISO}
      `;

      if (proposalsToDelete.length > 0) {
        console.log(`   ⚠️  Encontradas ${proposalsToDelete.length} propuestas que deberían estar eliminadas:`);
        
        for (const prop of proposalsToDelete) {
          const propStart = new Date(prop.start);
          const propEnd = new Date(prop.end);
          console.log(`      - ${propStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} (duración: ${(propEnd - propStart) / (1000 * 60)} min)`);
        }

        // Eliminar estas propuestas
        const deleted = await prisma.$executeRaw`
          DELETE FROM TimeSlot
          WHERE instructorId = ${cls.instructorId}
          AND courtId IS NULL
          AND id != ${cls.id}
          AND start >= ${startISO}
          AND start < ${endISO}
        `;

        console.log(`   ✅ Eliminadas ${deleted} propuestas\n`);
        totalDeleted += deleted;
      } else {
        console.log(`   ✅ Sin propuestas incorrectas\n`);
      }
    }

    console.log('='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80));
    console.log('');
    console.log(`   Clases verificadas: ${confirmedClasses.length}`);
    console.log(`   Propuestas eliminadas: ${totalDeleted}`);
    console.log('');
    
    if (totalDeleted > 0) {
      console.log('   ✅ Base de datos corregida');
      console.log('   Las propuestas incorrectas han sido eliminadas');
    } else {
      console.log('   ✅ Base de datos ya estaba correcta');
      console.log('   No había propuestas que debieran estar eliminadas');
    }
    
    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBlockedProposals();
