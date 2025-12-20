// Script para verificar la eliminación de propuestas cuando se confirma una clase
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProposalDeletion() {
  try {
    console.log('\n=== VERIFICANDO LÓGICA DE ELIMINACIÓN DE PROPUESTAS ===\n');

    // 1. Encontrar una clase confirmada reciente
    const confirmedClass = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.courtId,
        ts.courtNumber,
        ts.instructorId,
        i.name as instructorName,
        (ts.end - ts.start) / (1000 * 60) as durationMinutes
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.courtId IS NOT NULL
      ORDER BY ts.start DESC
      LIMIT 1
    `;

    if (confirmedClass.length === 0) {
      console.log('❌ No hay clases confirmadas para analizar');
      return;
    }

    const confirmed = confirmedClass[0];
    console.log('📍 CLASE CONFIRMADA ENCONTRADA:');
    console.log(`   ID: ${confirmed.id}`);
    console.log(`   Instructor: ${confirmed.instructorName} (ID: ${confirmed.instructorId})`);
    console.log(`   Inicio: ${new Date(confirmed.start).toLocaleString('es-ES')}`);
    console.log(`   Fin: ${new Date(confirmed.end).toLocaleString('es-ES')}`);
    console.log(`   Duración: ${confirmed.durationMinutes} minutos`);
    console.log(`   Pista: ${confirmed.courtNumber}\n`);

    // 2. Buscar propuestas que DEBERÍAN haberse eliminado
    const startTime = new Date(confirmed.start);
    const endTime = new Date(confirmed.end);
    
    console.log('🔍 BUSCANDO PROPUESTAS SOLAPADAS:');
    console.log(`   Rango: ${startTime.toISOString()} a ${endTime.toISOString()}\n`);

    const overlappingProposals = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.instructorId,
        ts.courtId,
        (ts.end - ts.start) / (1000 * 60) as durationMinutes,
        COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId
      WHERE ts.instructorId = ${confirmed.instructorId}
        AND ts.courtId IS NULL
        AND ts.start >= ${confirmed.start}
        AND ts.start < ${confirmed.end}
      GROUP BY ts.id
      ORDER BY ts.start
    `;

    if (overlappingProposals.length === 0) {
      console.log('✅ No hay propuestas solapadas (correcto - fueron eliminadas)');
    } else {
      console.log(`⚠️ ENCONTRADAS ${overlappingProposals.length} PROPUESTAS QUE DEBERÍAN HABERSE ELIMINADO:\n`);
      overlappingProposals.forEach((prop, idx) => {
        console.log(`   Propuesta ${idx + 1}:`);
        console.log(`   - ID: ${prop.id}`);
        console.log(`   - Inicio: ${new Date(prop.start).toLocaleString('es-ES')}`);
        console.log(`   - Fin: ${new Date(prop.end).toLocaleString('es-ES')}`);
        console.log(`   - Duración: ${prop.durationMinutes} min`);
        console.log(`   - Reservas: ${prop.bookingCount}`);
        console.log('');
      });
    }

    // 3. Verificar propuestas en el rango de tiempo completo (incluyendo 08:30-09:00 si clase es 08:00-09:00)
    console.log('📊 TODAS LAS PROPUESTAS DEL MISMO INSTRUCTOR EN ESE HORARIO:');
    
    const allProposals = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.courtId,
        (ts.end - ts.start) / (1000 * 60) as durationMinutes
      FROM TimeSlot ts
      WHERE ts.instructorId = ${confirmed.instructorId}
        AND ts.courtId IS NULL
        AND (
          (ts.start >= ${confirmed.start} AND ts.start < ${confirmed.end})
          OR (ts.end > ${confirmed.start} AND ts.end <= ${confirmed.end})
        )
      ORDER BY ts.start
    `;

    if (allProposals.length === 0) {
      console.log('   ✅ Ninguna propuesta solapada (sistema funcionando correctamente)\n');
    } else {
      console.log(`   ⚠️ ${allProposals.length} propuestas aún existen:\n`);
      allProposals.forEach((prop, idx) => {
        console.log(`   ${idx + 1}. ${new Date(prop.start).toLocaleTimeString('es-ES')} - ${new Date(prop.end).toLocaleTimeString('es-ES')} (${prop.durationMinutes} min)`);
      });
      console.log('');
    }

    // 4. Simular la query de eliminación que usa el código
    console.log('🧪 SIMULANDO QUERY DE ELIMINACIÓN DEL CÓDIGO:');
    const startISO = startTime.toISOString();
    const endISO = endTime.toISOString();
    console.log(`   Query: DELETE FROM TimeSlot`);
    console.log(`   WHERE instructorId = ${confirmed.instructorId}`);
    console.log(`     AND courtId IS NULL`);
    console.log(`     AND start >= '${startISO}'`);
    console.log(`     AND start < '${endISO}'`);

    // Contar cuántas se eliminarían
    const wouldDelete = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE instructorId = ${confirmed.instructorId}
        AND courtId IS NULL
        AND start >= ${confirmed.start}
        AND start < ${confirmed.end}
    `;

    console.log(`\n   Resultado: ${wouldDelete[0].count} propuestas se eliminarían\n`);

    // 5. Mostrar ejemplos de propuestas existentes para ese instructor
    console.log('📋 PROPUESTAS ACTUALES DEL INSTRUCTOR:');
    const instructorProposals = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.courtId,
        (ts.end - ts.start) / (1000 * 60) as durationMinutes
      FROM TimeSlot ts
      WHERE ts.instructorId = ${confirmed.instructorId}
        AND ts.courtId IS NULL
      ORDER BY ts.start
      LIMIT 10
    `;

    if (instructorProposals.length === 0) {
      console.log('   Sin propuestas pendientes');
    } else {
      instructorProposals.forEach((prop, idx) => {
        const start = new Date(prop.start);
        const end = new Date(prop.end);
        console.log(`   ${idx + 1}. ${start.toLocaleString('es-ES')} - ${end.toLocaleTimeString('es-ES')} (${prop.durationMinutes} min)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testProposalDeletion();
