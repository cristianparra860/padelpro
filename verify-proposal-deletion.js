import { prisma } from './src/lib/prisma.ts';

async function verifyProposalDeletion() {
  try {
    console.log('🔍 VERIFICANDO ELIMINACIÓN DE PROPUESTAS\n');
    
    // 1. Obtener la clase confirmada (verde) de las 08:00
    const confirmedClass = await prisma.timeSlot.findFirst({
      where: {
        start: new Date('2025-11-25T08:00:00.000Z'),
        courtId: { not: null }
      },
      include: {
        instructor: true
      }
    });
    
    if (!confirmedClass) {
      console.log('❌ No se encontró clase confirmada a las 08:00');
      await prisma.$disconnect();
      return;
    }
    
    console.log('🔵 CLASE CONFIRMADA:');
    console.log(`   Instructor: ${confirmedClass.instructor?.name}`);
    console.log(`   Hora inicio: ${new Date(Number(confirmedClass.start)).toLocaleString('es-ES')}`);
    console.log(`   Hora fin: ${new Date(Number(confirmedClass.end)).toLocaleString('es-ES')}`);
    console.log(`   Pista: ${confirmedClass.courtNumber}`);
    console.log(`   ID: ${confirmedClass.id}`);
    
    // 2. Buscar propuestas del MISMO INSTRUCTOR que solapen con esta clase
    const startTime = confirmedClass.start;
    const endTime = confirmedClass.end;
    const instructorId = confirmedClass.instructorId;
    
    const overlappingProposals = await prisma.$queryRawUnsafe(`
      SELECT id, start, end, level, genderCategory
      FROM TimeSlot
      WHERE instructorId = ?
      AND courtId IS NULL
      AND (
        (start >= ? AND start < ?)
        OR (end > ? AND end <= ?)
        OR (start <= ? AND end >= ?)
      )
    `, instructorId, startTime, endTime, startTime, endTime, startTime, endTime);
    
    console.log(`\n🟠 PROPUESTAS SOLAPADAS DEL MISMO INSTRUCTOR:`);
    console.log(`   Total encontradas: ${overlappingProposals.length}`);
    
    if (overlappingProposals.length > 0) {
      console.log('   ⚠️ PROBLEMA: Aún existen propuestas solapadas:');
      overlappingProposals.forEach(p => {
        const start = new Date(Number(p.start));
        console.log(`      - ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} | ${p.level} | ${p.genderCategory} | ID: ${p.id}`);
      });
      
      console.log('\n🗑️ ELIMINANDO AHORA...');
      
      for (const prop of overlappingProposals) {
        await prisma.timeSlot.delete({
          where: { id: prop.id }
        });
        console.log(`      ✅ Eliminada: ${prop.id}`);
      }
      
      console.log('\n✅ Propuestas eliminadas');
      
    } else {
      console.log('   ✅ No hay propuestas solapadas (correcto)');
    }
    
    // 3. Verificar total de propuestas en esa hora
    console.log('\n📊 VERIFICACIÓN COMPLETA DE LAS 08:00:');
    
    const allAt08 = await prisma.$queryRawUnsafe(`
      SELECT 
        ts.id,
        ts.courtId,
        ts.courtNumber,
        i.name as instructorName,
        ts.level,
        ts.genderCategory
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start >= ? AND ts.start < ?
    `, new Date('2025-11-25T08:00:00.000Z'), new Date('2025-11-25T08:30:00.000Z'));
    
    console.log(`   Total slots a las 08:00: ${allAt08.length}`);
    
    const confirmed = allAt08.filter(s => s.courtId !== null);
    const proposals = allAt08.filter(s => s.courtId === null);
    
    console.log(`   Confirmadas (verde): ${confirmed.length}`);
    confirmed.forEach(s => {
      console.log(`      - ${s.instructorName} | Pista ${s.courtNumber} | ${s.level}`);
    });
    
    console.log(`   Propuestas (naranja): ${proposals.length}`);
    proposals.forEach(s => {
      console.log(`      - ${s.instructorName} | ${s.level} | ${s.genderCategory}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyProposalDeletion();
