// Eliminar propuestas duplicadas - mantener solo cada 60 minutos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log('🔧 Limpiando propuestas duplicadas...\n');

  try {
    // Obtener todas las propuestas (courtId = null significa propuesta)
    const allProposals = await prisma.timeSlot.findMany({
      where: {
        courtId: null  // Usamos courtId en lugar de courtNumber
      },
      orderBy: [
        { instructorId: 'asc' },
        { start: 'asc' }
      ]
    });

    console.log(`📊 Total propuestas: ${allProposals.length}\n`);

    // Agrupar por instructor y día
    const byInstructorDay = new Map();
    
    for (const proposal of allProposals) {
      const day = new Date(proposal.start).toDateString();
      const key = `${proposal.instructorId}_${day}`;
      
      if (!byInstructorDay.has(key)) {
        byInstructorDay.set(key, []);
      }
      byInstructorDay.get(key).push(proposal);
    }

    console.log(`📅 Días únicos: ${byInstructorDay.size}\n`);

    const toDelete = [];
    let kept = 0;

    // Para cada grupo, mantener solo propuestas cada 60 minutos
    for (const [key, proposals] of byInstructorDay.entries()) {
      if (proposals.length <= 1) {
        kept += proposals.length;
        continue;
      }

      // Ordenar por hora
      proposals.sort((a, b) => new Date(a.start) - new Date(b.start));

      // Mantener la primera, eliminar las que estén a menos de 60 minutos
      let lastKept = null;

      for (const proposal of proposals) {
        if (!lastKept) {
          lastKept = proposal;
          kept++;
          continue;
        }

        const timeDiff = (new Date(proposal.start) - new Date(lastKept.start)) / (1000 * 60);

        if (timeDiff < 60) {
          toDelete.push(proposal.id);
        } else {
          lastKept = proposal;
          kept++;
        }
      }
    }

    console.log(`📊 Resultados:`);
    console.log(`   ✅ Propuestas a mantener: ${kept}`);
    console.log(`   🗑️  Propuestas a eliminar: ${toDelete.length}\n`);

    if (toDelete.length === 0) {
      console.log('✅ No hay duplicados!\n');
      return;
    }

    // Eliminar (primero bookings, luego timeslots)
    console.log('🗑️  Eliminando...');
    
    // Eliminar bookings primero
    const deletedBookings = await prisma.booking.deleteMany({
      where: {
        timeSlotId: {
          in: toDelete
        }
      }
    });
    console.log(`   📌 Bookings eliminados: ${deletedBookings.count}`);
    
    // Ahora eliminar timeslots
    const deleted = await prisma.timeSlot.deleteMany({
      where: {
        id: {
          in: toDelete
        }
      }
    });

    console.log(`✅ Eliminadas ${deleted.count} propuestas duplicadas!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicates();
