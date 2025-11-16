const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧹 LIMPIEZA DE CLASES FANTASMA\n');
    
    // Encontrar todas las clases confirmadas (con pista) sin bookings activas
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        courtNumber: { not: null }
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      }
    });
    
    console.log('Total clases con pista asignada:', confirmedClasses.length);
    
    const ghostClasses = confirmedClasses.filter(c => c.bookings.length === 0);
    
    console.log('Clases fantasma (sin bookings activas):', ghostClasses.length);
    
    if (ghostClasses.length > 0) {
      console.log('\n📍 Detalles de clases fantasma:');
      ghostClasses.forEach(c => {
        const d = new Date(c.start);
        console.log(`  - ${c.id.substring(0, 10)}... | Pista ${c.courtNumber} | ${d.toLocaleString('es-ES')} | ${c.level}`);
      });
      
      console.log('\n🔧 LIBERANDO CLASES FANTASMA...');
      
      for (const ghostClass of ghostClasses) {
        // Liberar la clase (quitar pista Y resetear género)
        await prisma.timeSlot.update({
          where: { id: ghostClass.id },
          data: {
            courtNumber: null,
            courtId: null,
            genderCategory: null // Resetear categoría de género
          }
        });
        
        // Limpiar schedules asociados
        await prisma.courtSchedule.deleteMany({
          where: { timeSlotId: ghostClass.id }
        });
        
        await prisma.instructorSchedule.deleteMany({
          where: { timeSlotId: ghostClass.id }
        });
        
        console.log(`  ✅ Liberada clase ${ghostClass.id.substring(0, 10)}... (género reseteado)`);
      }
      
      console.log(`\n✅ ${ghostClasses.length} clases fantasma liberadas y convertidas a propuestas`);
    } else {
      console.log('\n✅ No hay clases fantasma para limpiar');
    }
    
    // Verificar estado final
    const finalConfirmed = await prisma.timeSlot.count({
      where: { courtNumber: { not: null } }
    });
    
    const finalProposed = await prisma.timeSlot.count({
      where: { courtNumber: null }
    });
    
    console.log('\n📊 ESTADO FINAL:');
    console.log(`  Clases confirmadas: ${finalConfirmed}`);
    console.log(`  Clases propuestas: ${finalProposed}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
