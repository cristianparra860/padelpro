// Script para eliminar propuestas que están cada 30 minutos (deberían ser cada 60 min)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOverlappingProposals() {
  console.log('🔧 Limpiando propuestas solapadas...\n');

  try {
    // 1. Obtener todas las propuestas (sin pista asignada)
    const proposals = await prisma.$queryRaw`
      SELECT id, instructorId, start, end, level, category
      FROM TimeSlot
      WHERE courtNumber IS NULL
      ORDER BY instructorId, start ASC
    `;

    console.log(`📊 Total propuestas: ${proposals.length}\n`);

    // 2. Agrupar por instructor y día
    const byInstructorAndDay = new Map();

    for (const proposal of proposals) {
      const key = `${proposal.instructorId}_${new Date(proposal.start).toDateString()}`;
      if (!byInstructorAndDay.has(key)) {
        byInstructorAndDay.set(key, []);
      }
      byInstructorAndDay.get(key).push(proposal);
    }

    console.log(`📅 Días con propuestas: ${byInstructorAndDay.size}\n`);

    // 3. Para cada grupo, mantener solo propuestas cada 60 minutos
    const toDelete = [];
    
    for (const [key, groupProposals] of byInstructorAndDay.entries()) {
      if (groupProposals.length <= 1) continue;

      // Ordenar por hora de inicio
      groupProposals.sort((a, b) => new Date(a.start) - new Date(b.start));

      // Mantener solo propuestas que estén separadas por al menos 60 minutos
      let lastKept = null;

      for (const proposal of groupProposals) {
        if (!lastKept) {
          // Mantener la primera
          lastKept = proposal;
          continue;
        }

        const timeDiff = (new Date(proposal.start) - new Date(lastKept.start)) / (1000 * 60); // minutos

        if (timeDiff < 60) {
          // Demasiado cerca, eliminar
          toDelete.push(proposal);
          console.log(`❌ Eliminar: ${proposal.id} (${new Date(proposal.start).toLocaleTimeString()} - solo ${timeDiff} min después)`);
        } else {
          // Suficientemente separada, mantener
          lastKept = proposal;
        }
      }
    }

    console.log(`\n🗑️  Total a eliminar: ${toDelete.length}\n`);

    if (toDelete.length === 0) {
      console.log('✅ No hay propuestas solapadas!\n');
      return;
    }

    // 4. Eliminar
    for (const proposal of toDelete) {
      // Primero eliminar reservas
      await prisma.$executeRaw`
        DELETE FROM Booking WHERE timeSlotId = ${proposal.id}
      `;
      
      // Luego eliminar propuesta
      await prisma.$executeRaw`
        DELETE FROM TimeSlot WHERE id = ${proposal.id}
      `;
    }

    console.log(`✅ Limpieza completada!`);
    console.log(`   🗑️  Propuestas eliminadas: ${toDelete.length}`);
    console.log(`   ✅ Propuestas mantenidas: ${proposals.length - toDelete.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOverlappingProposals();
