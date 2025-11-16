const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const now = new Date();
    const nowISO = now.toISOString();
    const nowTimestamp = now.getTime();
    
    console.log('🗑️  Limpiando clases antiguas con SQL directo...');
    console.log('   Fecha actual ISO:', nowISO);
    console.log('   Timestamp:', nowTimestamp);
    
    // Usar SQL directo para eliminar
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM TimeSlot 
      WHERE courtNumber IS NULL 
      AND (
        start < ? OR 
        CAST(start AS INTEGER) < ?
      )
    `, nowISO, nowTimestamp);
    
    console.log('✅ Eliminadas', result, 'propuestas antiguas');
    
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
