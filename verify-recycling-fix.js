// Script para verificar que el fix del reciclado funciona correctamente
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRecyclingFix() {
  try {
    console.log('\n✅ === VERIFICACIÓN POST-FIX: RECICLADO DE CLASES ===\n');

    // 1. Buscar clase confirmada de María Fernández en 26/12
    const mariaClasses = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.courtId,
        ts.courtNumber,
        ts.instructorId,
        i.name as instructorName,
        (ts.end - ts.start) as durationMs
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE i.name = 'María Fernández'
        AND ts.courtId IS NOT NULL
        AND ts.start >= ${new Date('2025-12-26').getTime()}
        AND ts.start < ${new Date('2025-12-27').getTime()}
      ORDER BY ts.start
    `;

    if (mariaClasses.length === 0) {
      console.log('❌ No se encontró la clase confirmada de María Fernández el 26/12\n');
      return;
    }

    const confirmedClass = mariaClasses[0];
    const start = new Date(Number(confirmedClass.start));
    const end = new Date(Number(confirmedClass.end));
    const durationMin = Number(confirmedClass.durationMs) / (1000 * 60);

    console.log('📍 CLASE CONFIRMADA ENCONTRADA:');
    console.log(`   Instructor: ${confirmedClass.instructorName}`);
    console.log(`   Horario: ${start.toLocaleString('es-ES')} - ${end.toLocaleTimeString('es-ES')}`);
    console.log(`   Duración: ${durationMin} minutos`);
    console.log(`   Pista: ${confirmedClass.courtNumber}`);
    console.log(`   ID: ${confirmedClass.id}\n`);

    // 2. Verificar que NO hay propuestas solapadas
    const overlapping = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        (ts.end - ts.start) as durationMs
      FROM TimeSlot ts
      WHERE ts.instructorId = ${confirmedClass.instructorId}
        AND ts.courtId IS NULL
        AND (
          (ts.start >= ${confirmedClass.start} AND ts.start < ${confirmedClass.end})
          OR (ts.end > ${confirmedClass.start} AND ts.end <= ${confirmedClass.end})
          OR (ts.start <= ${confirmedClass.start} AND ts.end >= ${confirmedClass.end})
        )
      ORDER BY ts.start
    `;

    console.log('🔍 VERIFICACIÓN DE PROPUESTAS SOLAPADAS:');
    if (overlapping.length === 0) {
      console.log('   ✅ CORRECTO: No hay propuestas solapadas (fueron eliminadas)\n');
    } else {
      console.log(`   ❌ PROBLEMA: Hay ${overlapping.length} propuestas que NO se eliminaron:\n`);
      overlapping.forEach((prop, idx) => {
        const propStart = new Date(Number(prop.start));
        const propEnd = new Date(Number(prop.end));
        const propDuration = Number(prop.durationMs) / (1000 * 60);
        console.log(`   ${idx + 1}. ${propStart.toLocaleTimeString('es-ES')} - ${propEnd.toLocaleTimeString('es-ES')} (${propDuration} min) - ID: ${prop.id}`);
      });
      console.log('');
    }

    // 3. Verificar duración de la clase
    console.log('⏱️ VERIFICACIÓN DE DURACIÓN:');
    if (durationMin === 60) {
      console.log('   ✅ CORRECTO: La clase tiene 60 minutos\n');
    } else if (durationMin === 30) {
      console.log('   ❌ PROBLEMA: La clase sigue siendo de 30 minutos\n');
    } else {
      console.log(`   ⚠️ Duración inesperada: ${durationMin} minutos\n`);
    }

    // 4. Contar propuestas restantes del instructor
    const totalProposals = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE instructorId = ${confirmedClass.instructorId}
        AND courtId IS NULL
    `;

    console.log('📊 ESTADÍSTICAS:');
    console.log(`   Total de propuestas restantes: ${totalProposals[0].count}`);

    // 5. Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN DEL FIX:');
    console.log('='.repeat(60));
    
    const allGood = overlapping.length === 0 && durationMin === 60;
    
    if (allGood) {
      console.log('✅ TODO CORRECTO - El reciclado de clases funciona perfectamente:');
      console.log('   1. La clase se extendió a 60 minutos');
      console.log('   2. Las propuestas solapadas se eliminaron correctamente');
      console.log('   3. El instructor quedó disponible para esa hora\n');
    } else {
      console.log('⚠️ HAY PROBLEMAS:');
      if (durationMin !== 60) {
        console.log('   - La clase NO se extendió a 60 minutos');
      }
      if (overlapping.length > 0) {
        console.log(`   - Hay ${overlapping.length} propuestas solapadas que NO se eliminaron`);
      }
      console.log('\n💡 NOTA: Estos problemas se corrigieron en el código.');
      console.log('   Para verificar el fix, haz una nueva reserva y confirma una clase.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRecyclingFix();
