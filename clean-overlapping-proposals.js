import { prisma } from './src/lib/prisma.ts';

async function cleanOverlappingProposals() {
  try {
    console.log('🧹 LIMPIANDO PROPUESTAS SOLAPADAS CON CLASES CONFIRMADAS\n');
    
    // 1. Obtener todas las clases confirmadas (courtId asignado)
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
      },
      select: {
        id: true,
        start: true,
        end: true,
        instructorId: true,
        courtNumber: true
      }
    });
    
    console.log(`🔵 Clases confirmadas encontradas: ${confirmedClasses.length}\n`);
    
    if (confirmedClasses.length === 0) {
      console.log('✅ No hay clases confirmadas');
      await prisma.$disconnect();
      return;
    }
    
    let totalDeleted = 0;
    
    // 2. Para cada clase confirmada, eliminar propuestas solapadas del mismo instructor
    for (const confirmedClass of confirmedClasses) {
      const date = new Date(Number(confirmedClass.start));
      const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`📅 ${date.toLocaleDateString('es-ES')} ${time} - Pista ${confirmedClass.courtNumber}`);
      
      // Eliminar propuestas del mismo instructor que solapen con esta clase
      const deleted = await prisma.$executeRawUnsafe(`
        DELETE FROM TimeSlot
        WHERE instructorId = ?
        AND courtId IS NULL
        AND id != ?
        AND (
          (start >= ? AND start < ?)
          OR (end > ? AND end <= ?)
          OR (start <= ? AND end >= ?)
        )
      `, 
        confirmedClass.instructorId,
        confirmedClass.id,
        confirmedClass.start, confirmedClass.end,
        confirmedClass.start, confirmedClass.end,
        confirmedClass.start, confirmedClass.end
      );
      
      if (deleted > 0) {
        console.log(`   ✅ Eliminadas ${deleted} propuestas solapadas`);
        totalDeleted += deleted;
      } else {
        console.log(`   ℹ️ Sin propuestas solapadas`);
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total propuestas eliminadas: ${totalDeleted}`);
    console.log(`   Clases confirmadas procesadas: ${confirmedClasses.length}`);
    
    // 3. Verificar total de TimeSlots después
    const totalAfter = await prisma.timeSlot.count();
    const proposalsAfter = await prisma.timeSlot.count({
      where: { courtId: null }
    });
    const confirmedAfter = await prisma.timeSlot.count({
      where: { courtId: { not: null } }
    });
    
    console.log(`\n💾 Estado final:`);
    console.log(`   Total TimeSlots: ${totalAfter}`);
    console.log(`   Propuestas (naranjas): ${proposalsAfter}`);
    console.log(`   Confirmadas (verdes): ${confirmedAfter}`);
    
    console.log('\n✅ LIMPIEZA COMPLETA');
    console.log('💡 Calendario del club ahora no mostrará naranjas solapados con verdes');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOverlappingProposals();
