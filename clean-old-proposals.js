const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const now = new Date();
    
    console.log('🗑️  Limpiando clases antiguas...');
    console.log('   Eliminando propuestas antes de:', now.toLocaleString('es-ES'));
    
    // Eliminar TimeSlots con fecha anterior a AHORA que NO tengan pista asignada
    const deleted = await prisma.timeSlot.deleteMany({
      where: {
        start: {
          lt: now
        },
        courtNumber: null // Solo propuestas sin confirmar
      }
    });
    
    console.log('✅ Eliminadas', deleted.count, 'propuestas antiguas');
    
    // Verificar cuántas quedan
    const remaining = await prisma.timeSlot.count();
    const proposals = await prisma.timeSlot.count({ where: { courtNumber: null } });
    const confirmed = await prisma.timeSlot.count({ where: { courtNumber: { not: null } } });
    
    console.log('\n📊 Estado actual:');
    console.log('  Total TimeSlots:', remaining);
    console.log('  Propuestas:', proposals);
    console.log('  Confirmadas:', confirmed);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
