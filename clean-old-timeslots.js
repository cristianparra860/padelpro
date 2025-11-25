import { prisma } from './src/lib/prisma.ts';

async function cleanOldTimeSlots() {
  try {
    console.log('🧹 LIMPIANDO TIMESLOTS ANTIGUOS\n');
    
    // Fecha límite: hace 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const limitTimestamp = sevenDaysAgo.getTime();
    
    console.log(`📅 Eliminando TimeSlots anteriores a: ${sevenDaysAgo.toLocaleDateString('es-ES')}`);
    console.log(`   Timestamp: ${limitTimestamp}\n`);
    
    // Contar total antes
    const totalBefore = await prisma.timeSlot.count();
    console.log(`📊 Total TimeSlots ANTES: ${totalBefore}`);
    
    // Eliminar slots antiguos sin reservas confirmadas (courtId = NULL o pasados)
    const deleted = await prisma.$executeRawUnsafe(`
      DELETE FROM TimeSlot
      WHERE start < ?
    `, limitTimestamp);
    
    console.log(`\n🗑️ Eliminados: ${deleted} TimeSlots antiguos`);
    
    // Contar total después
    const totalAfter = await prisma.timeSlot.count();
    console.log(`📊 Total TimeSlots DESPUÉS: ${totalAfter}`);
    console.log(`📉 Reducción: ${totalBefore - totalAfter} slots (${((totalBefore - totalAfter) / totalBefore * 100).toFixed(1)}%)`);
    
    console.log('\n✅ LIMPIEZA COMPLETA');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOldTimeSlots();
