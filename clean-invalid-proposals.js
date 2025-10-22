// Script para eliminar propuestas de clases que no tienen 60 minutos disponibles
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInvalidProposals() {
  console.log('🔧 Iniciando limpieza de propuestas inválidas...\n');

  try {
    // 1. Obtener todas las clases propuestas (sin pista asignada)
    const proposedClasses = await prisma.$queryRaw`
      SELECT id, instructorId, start, end, courtNumber
      FROM TimeSlot
      WHERE courtNumber IS NULL
      ORDER BY start ASC
    `;

    console.log(`📊 Total propuestas encontradas: ${proposedClasses.length}\n`);

    // 2. Obtener todas las clases confirmadas
    const confirmedClasses = await prisma.$queryRaw`
      SELECT id, instructorId, start, end, courtNumber
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      ORDER BY start ASC
    `;

    console.log(`✅ Total clases confirmadas: ${confirmedClasses.length}\n`);

    // 3. Verificar cada propuesta
    const invalidProposals = [];
    
    for (const proposal of proposedClasses) {
      const proposalStart = new Date(proposal.start);
      const proposalEnd = new Date(proposal.end);
      
      // Verificar si hay conflicto con alguna clase confirmada del mismo instructor
      const hasConflict = confirmedClasses.some(confirmed => {
        // Solo verificar mismo instructor
        if (confirmed.instructorId !== proposal.instructorId) return false;
        
        const confirmedStart = new Date(confirmed.start);
        const confirmedEnd = new Date(confirmed.end);
        
        // Verificar solapamiento
        const overlaps = proposalStart < confirmedEnd && proposalEnd > confirmedStart;
        
        if (overlaps) {
          console.log(`⚠️  Conflicto detectado:`);
          console.log(`   Propuesta: ${proposal.id} (${proposalStart.toISOString()})`);
          console.log(`   Confirmada: ${confirmed.id} (${confirmedStart.toISOString()}) en pista ${confirmed.courtNumber}`);
        }
        
        return overlaps;
      });

      if (hasConflict) {
        invalidProposals.push(proposal);
      }
    }

    console.log(`\n🔍 Total propuestas inválidas encontradas: ${invalidProposals.length}\n`);

    if (invalidProposals.length === 0) {
      console.log('✅ No hay propuestas inválidas para eliminar!\n');
      return;
    }

    // 4. Confirmar antes de eliminar
    console.log('📋 Lista de propuestas a eliminar:\n');
    for (const proposal of invalidProposals.slice(0, 10)) {
      const start = new Date(proposal.start);
      console.log(`   - ${proposal.id} | ${start.toLocaleString('es-ES')}`);
    }
    
    if (invalidProposals.length > 10) {
      console.log(`   ... y ${invalidProposals.length - 10} más\n`);
    }

    console.log('\n⚠️  ADVERTENCIA: Se eliminarán estas propuestas de la base de datos\n');
    console.log('🔄 Eliminando...\n');

    // 5. Eliminar las propuestas inválidas
    let deleted = 0;
    for (const proposal of invalidProposals) {
      // Primero eliminar las reservas asociadas
      await prisma.$executeRaw`
        DELETE FROM Booking WHERE timeSlotId = ${proposal.id}
      `;
      
      // Luego eliminar la propuesta
      await prisma.$executeRaw`
        DELETE FROM TimeSlot WHERE id = ${proposal.id}
      `;
      
      deleted++;
    }

    console.log(`✅ Limpieza completada!`);
    console.log(`   🗑️  Propuestas eliminadas: ${deleted}`);
    console.log(`   ✅ Propuestas válidas mantenidas: ${proposedClasses.length - deleted}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
cleanInvalidProposals();
