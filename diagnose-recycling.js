// Script para diagnosticar el problema de eliminación de propuestas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseProposalDeletion() {
  try {
    console.log('\n🔍 === DIAGNÓSTICO: RECICLADO DE CLASES ===\n');

    // 1. Encontrar una clase confirmada (pista asignada)
    const confirmedClasses = await prisma.$queryRaw`
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
      WHERE ts.courtId IS NOT NULL
      ORDER BY ts.start DESC
      LIMIT 3
    `;

    if (confirmedClasses.length === 0) {
      console.log('❌ No hay clases confirmadas. Crea una reserva primero.\n');
      return;
    }

    console.log(`✅ Encontradas ${confirmedClasses.length} clases confirmadas:\n`);
    confirmedClasses.forEach((cls, idx) => {
      const start = new Date(Number(cls.start));
      const end = new Date(Number(cls.end));
      const durationMin = Number(cls.durationMs) / (1000 * 60);
      console.log(`${idx + 1}. Instructor: ${cls.instructorName}`);
      console.log(`   Horario: ${start.toLocaleString('es-ES')} - ${end.toLocaleTimeString('es-ES')}`);
      console.log(`   Duración: ${durationMin} minutos`);
      console.log(`   Pista: ${cls.courtNumber}`);
      console.log(`   SlotID: ${cls.id}\n`);
    });

    // Analizar la primera clase confirmada
    const confirmed = confirmedClasses[0];
    const startDate = new Date(Number(confirmed.start));
    const endDate = new Date(Number(confirmed.end));
    
    console.log('📊 ANÁLISIS DE PROPUESTAS SOLAPADAS:\n');
    console.log(`Clase confirmada:`);
    console.log(`  - Inicio: ${startDate.toISOString()}`);
    console.log(`  - Fin: ${endDate.toISOString()}`);
    console.log(`  - Instructor ID: ${confirmed.instructorId}\n`);

    // 2. Buscar propuestas que se solapan (deberían haberse eliminado)
    console.log('🔍 Buscando propuestas solapadas (que NO deberían existir):\n');
    
    const overlappingProposals = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.instructorId,
        (ts.end - ts.start) as durationMs,
        COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status != 'CANCELLED'
      WHERE ts.instructorId = ${confirmed.instructorId}
        AND ts.courtId IS NULL
        AND (
          (ts.start >= ${confirmed.start} AND ts.start < ${confirmed.end})
          OR (ts.end > ${confirmed.start} AND ts.end <= ${confirmed.end})
          OR (ts.start <= ${confirmed.start} AND ts.end >= ${confirmed.end})
        )
      GROUP BY ts.id
      ORDER BY ts.start
    `;

    if (overlappingProposals.length === 0) {
      console.log('✅ No hay propuestas solapadas - El sistema funciona correctamente\n');
    } else {
      console.log(`⚠️ PROBLEMA: Hay ${overlappingProposals.length} propuestas que deberían haberse eliminado:\n`);
      
      overlappingProposals.forEach((prop, idx) => {
        const start = new Date(Number(prop.start));
        const end = new Date(Number(prop.end));
        const durationMin = Number(prop.durationMs) / (1000 * 60);
        
        console.log(`  Propuesta ${idx + 1}:`);
        console.log(`    ID: ${prop.id}`);
        console.log(`    Horario: ${start.toLocaleString('es-ES')} - ${end.toLocaleTimeString('es-ES')}`);
        console.log(`    Duración: ${durationMin} min`);
        console.log(`    Reservas activas: ${prop.bookingCount}`);
        console.log('');
      });
    }

    // 3. Verificar el formato de las fechas en la base de datos
    console.log('🔬 FORMATO DE FECHAS EN BD:\n');
    
    const rawDate = await prisma.$queryRaw`
      SELECT 
        start,
        typeof(start) as startType,
        end,
        typeof(end) as endType
      FROM TimeSlot 
      WHERE id = ${confirmed.id}
    `;
    
    console.log('Clase confirmada en BD:');
    console.log(`  start: ${rawDate[0].start} (tipo: ${rawDate[0].startType})`);
    console.log(`  end: ${rawDate[0].end} (tipo: ${rawDate[0].endType})\n`);

    // 4. Probar diferentes formatos de query
    console.log('🧪 PROBANDO QUERY DE ELIMINACIÓN:\n');
    
    // Formato 1: .toISOString() (como en el código actual)
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    
    console.log('Formato 1 - .toISOString():');
    console.log(`  start: ${startISO}`);
    console.log(`  end: ${endISO}`);
    
    const testQuery1 = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE instructorId = ${confirmed.instructorId}
        AND courtId IS NULL
        AND (
          (start >= ${startISO} AND start < ${endISO})
          OR (end > ${startISO} AND end <= ${endISO})
        )
    `;
    console.log(`  Resultado: ${testQuery1[0].count} propuestas encontradas\n`);

    // Formato 2: Timestamp directo (números)
    console.log('Formato 2 - Timestamps numéricos:');
    console.log(`  start: ${confirmed.start}`);
    console.log(`  end: ${confirmed.end}`);
    
    const testQuery2 = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE instructorId = ${confirmed.instructorId}
        AND courtId IS NULL
        AND (
          (start >= ${confirmed.start} AND start < ${confirmed.end})
          OR (end > ${confirmed.start} AND end <= ${confirmed.end})
        )
    `;
    console.log(`  Resultado: ${testQuery2[0].count} propuestas encontradas\n`);

    // 5. Mostrar TODAS las propuestas del instructor
    console.log('📋 TODAS LAS PROPUESTAS DEL INSTRUCTOR:\n');
    
    const allProposals = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.courtId,
        (ts.end - ts.start) as durationMs
      FROM TimeSlot ts
      WHERE ts.instructorId = ${confirmed.instructorId}
        AND ts.courtId IS NULL
      ORDER BY ts.start
      LIMIT 20
    `;

    if (allProposals.length === 0) {
      console.log('  (Sin propuestas)\n');
    } else {
      allProposals.forEach((prop, idx) => {
        const start = new Date(Number(prop.start));
        const end = new Date(Number(prop.end));
        const durationMin = Number(prop.durationMs) / (1000 * 60);
        console.log(`  ${idx + 1}. ${start.toLocaleDateString('es-ES')} ${start.toLocaleTimeString('es-ES')} - ${end.toLocaleTimeString('es-ES')} (${durationMin} min)`);
      });
      console.log('');
    }

    // 6. Verificar si el problema es la extensión de 30 a 60 min
    const durationMin = Number(confirmed.durationMs) / (1000 * 60);
    console.log(`\n⏱️ DURACIÓN DE LA CLASE CONFIRMADA: ${durationMin} minutos`);
    
    if (durationMin === 30) {
      console.log('⚠️ PROBLEMA: La clase sigue siendo de 30 minutos, debería ser 60 minutos');
      console.log('   El código de extensión puede no estar funcionando.\n');
    } else if (durationMin === 60) {
      console.log('✅ La clase se extendió correctamente a 60 minutos\n');
    }

    // 7. Buscar propuestas específicas de 30 min que deberían eliminarse
    const next30min = new Date(startDate.getTime() + (30 * 60 * 1000));
    console.log('🎯 PROPUESTAS DE 30 MIN QUE DEBERÍAN ELIMINARSE:\n');
    console.log(`  Primera ranura: ${startDate.toLocaleTimeString('es-ES')} - ${next30min.toLocaleTimeString('es-ES')}`);
    console.log(`  Segunda ranura: ${next30min.toLocaleTimeString('es-ES')} - ${endDate.toLocaleTimeString('es-ES')}\n`);
    
    const specific30minSlots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        (ts.end - ts.start) as durationMs
      FROM TimeSlot ts
      WHERE ts.instructorId = ${confirmed.instructorId}
        AND ts.courtId IS NULL
        AND (ts.end - ts.start) = ${30 * 60 * 1000}
        AND ts.start >= ${confirmed.start}
        AND ts.end <= ${confirmed.end}
      ORDER BY ts.start
    `;
    
    if (specific30minSlots.length === 0) {
      console.log('✅ No hay propuestas de 30 min en ese rango\n');
    } else {
      console.log(`⚠️ Hay ${specific30minSlots.length} propuestas de 30 min que deberían haberse eliminado:\n`);
      specific30minSlots.forEach((slot, idx) => {
        const start = new Date(Number(slot.start));
        const end = new Date(Number(slot.end));
        console.log(`  ${idx + 1}. ${start.toLocaleTimeString('es-ES')} - ${end.toLocaleTimeString('es-ES')} (ID: ${slot.id})`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseProposalDeletion();
