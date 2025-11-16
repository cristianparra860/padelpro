const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧹 LIMPIEZA DE CATEGORÍAS DE GÉNERO EN PROPUESTAS\n');
    
    // Buscar todas las propuestas (sin pista) que tengan género asignado
    const proposalsWithGender = await prisma.timeSlot.findMany({
      where: {
        courtNumber: null, // Propuestas sin pista
        genderCategory: { not: null } // Pero con género asignado
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      }
    });
    
    console.log('📍 Propuestas con género asignado:', proposalsWithGender.length);
    
    if (proposalsWithGender.length > 0) {
      console.log('\n🔍 Analizando...');
      
      const toReset = [];
      
      for (const proposal of proposalsWithGender) {
        const hasActiveBookings = proposal.bookings.length > 0;
        const d = new Date(proposal.start);
        
        if (hasActiveBookings) {
          console.log(`  ⚠️  ${proposal.id.substring(0, 10)}... | ${d.toLocaleString('es-ES')} | Género: ${proposal.genderCategory} | Bookings: ${proposal.bookings.length}`);
          console.log('      → MANTENER género (tiene bookings activas)');
        } else {
          console.log(`  🔧 ${proposal.id.substring(0, 10)}... | ${d.toLocaleString('es-ES')} | Género: ${proposal.genderCategory} | Sin bookings`);
          console.log('      → RESETEAR género');
          toReset.push(proposal.id);
        }
      }
      
      if (toReset.length > 0) {
        console.log(`\n🔄 Reseteando género de ${toReset.length} propuestas sin bookings...`);
        
        const result = await prisma.timeSlot.updateMany({
          where: {
            id: { in: toReset }
          },
          data: {
            genderCategory: null
          }
        });
        
        console.log(`✅ ${result.count} propuestas actualizadas (género reseteado)`);
      } else {
        console.log('\n✅ Todas las propuestas con género tienen bookings activas (correcto)');
      }
    } else {
      console.log('✅ No hay propuestas con género asignado para limpiar');
    }
    
    // Verificar estado final
    const remaining = await prisma.timeSlot.count({
      where: {
        courtNumber: null,
        genderCategory: { not: null }
      }
    });
    
    console.log('\n📊 ESTADO FINAL:');
    console.log(`  Propuestas con género asignado: ${remaining}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
