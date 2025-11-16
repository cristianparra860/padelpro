const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicates() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();
    
    console.log('🔍 Buscando duplicados: clases confirmadas + propuestas del mismo instructor/horario');
    
    // Encontrar todas las clases confirmadas de hoy
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        start: { gte: todayISO, lt: tomorrowISO },
        courtId: { not: null }
      },
      select: {
        id: true,
        start: true,
        instructorId: true,
        courtNumber: true
      }
    });
    
    console.log(`✅ Encontradas ${confirmedClasses.length} clases confirmadas`);
    
    let duplicatesFound = 0;
    let duplicatesDeleted = 0;
    
    for (const confirmed of confirmedClasses) {
      // Buscar propuestas del mismo instructor y mismo horario
      const duplicateProposals = await prisma.timeSlot.findMany({
        where: {
          start: confirmed.start,
          instructorId: confirmed.instructorId,
          courtId: null, // Solo propuestas
          id: { not: confirmed.id } // Excluir la clase confirmada misma
        }
      });
      
      if (duplicateProposals.length > 0) {
        duplicatesFound += duplicateProposals.length;
        const start = new Date(confirmed.start);
        console.log(`\n⚠️ Duplicados encontrados para ${start.toLocaleTimeString()} (Pista ${confirmed.courtNumber}):`);
        
        for (const dup of duplicateProposals) {
          // Verificar si tiene bookings
          const bookings = await prisma.booking.findMany({
            where: {
              timeSlotId: dup.id,
              status: { in: ['PENDING', 'CONFIRMED'] }
            }
          });
          
          console.log(`   - Propuesta ID ${dup.id.substring(0, 12)}... tiene ${bookings.length} bookings`);
          
          if (bookings.length === 0) {
            // Eliminar propuesta vacía
            await prisma.timeSlot.delete({
              where: { id: dup.id }
            });
            console.log(`     ✅ Eliminada (sin bookings)`);
            duplicatesDeleted++;
          } else {
            console.log(`     ⚠️ Tiene bookings - revisar manualmente`);
          }
        }
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Duplicados encontrados: ${duplicatesFound}`);
    console.log(`   Duplicados eliminados: ${duplicatesDeleted}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates();
