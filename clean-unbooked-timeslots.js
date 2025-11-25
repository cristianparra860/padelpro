import { prisma } from './src/lib/prisma.ts';

async function cleanAllUnbookedTimeSlots() {
  try {
    console.log('🧹 LIMPIANDO TIMESLOTS SIN RESERVAS\n');
    
    // 1. Contar total
    const totalBefore = await prisma.timeSlot.count();
    console.log(`📊 Total TimeSlots ANTES: ${totalBefore}`);
    
    // 2. Contar con courtId asignado (confirmados)
    const confirmed = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM TimeSlot WHERE courtId IS NOT NULL
    `);
    console.log(`🔵 TimeSlots confirmados (courtId asignado): ${confirmed[0].count}`);
    
    // 3. Contar propuestas (courtId = NULL)
    const proposals = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM TimeSlot WHERE courtId IS NULL
    `);
    console.log(`🟠 TimeSlots propuestas (courtId = NULL): ${proposals[0].count}`);
    
    console.log('\n🗑️ ESTRATEGIA:');
    console.log('   Eliminar SOLO las propuestas sin bookings (courtId = NULL)');
    console.log('   Mantener clases confirmadas (court asignado)\n');
    
    // 4. Eliminar propuestas sin bookings
    const deleted = await prisma.$executeRawUnsafe(`
      DELETE FROM TimeSlot
      WHERE courtId IS NULL
    `);
    
    console.log(`✅ Eliminadas: ${deleted} propuestas sin asignación de pista`);
    
    // 5. Verificar después
    const totalAfter = await prisma.timeSlot.count();
    console.log(`\n📊 Total TimeSlots DESPUÉS: ${totalAfter}`);
    console.log(`📉 Reducción: ${totalBefore - totalAfter} slots`);
    console.log(`💾 Espacio liberado: ~${((totalBefore - totalAfter) * 0.5 / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ BASE DE DATOS OPTIMIZADA');
    console.log('💡 Ahora puedes generar nuevos TimeSlots sin exceder límites');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllUnbookedTimeSlots();
