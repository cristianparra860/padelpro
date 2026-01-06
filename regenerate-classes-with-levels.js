const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateClasses() {
  console.log('🔄 Regenerando clases con rangos de nivel correctos...\n');
  
  try {
    // 1. Eliminar SOLO TimeSlots vacíos con nivel "abierto" o sin levelRange
    const toDelete = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        OR: [
          { level: { in: ['ABIERTO', 'abierto'] } },
          { levelRange: null },
          { levelRange: 'abierto' }
        ]
      },
      include: {
        bookings: {
          where: {
            status: { not: 'CANCELLED' }
          }
        }
      }
    });
    
    console.log(`📊 TimeSlots candidatos a eliminar: ${toDelete.length}`);
    
    // Filtrar solo los que NO tienen bookings activos
    const emptySlots = toDelete.filter(slot => slot.bookings.length === 0);
    console.log(`📊 TimeSlots vacíos a eliminar: ${emptySlots.length}\n`);
    
    // Eliminar los vacíos
    let deletedCount = 0;
    for (const slot of emptySlots) {
      await prisma.timeSlot.delete({
        where: { id: slot.id }
      });
      deletedCount++;
      
      if (deletedCount % 50 === 0) {
        console.log(`   Eliminados ${deletedCount}/${emptySlots.length}...`);
      }
    }
    
    console.log(`\n✅ Eliminados ${deletedCount} TimeSlots vacíos con nivel "abierto"\n`);
    
    // 2. Llamar al API para regenerar clases
    console.log('🚀 Llamando al generador para crear nuevas clases...\n');
    
    const today = new Date();
    const daysToGenerate = 7; // Generar para los próximos 7 días
    
    for (let i = 0; i < daysToGenerate; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      console.log(`   📅 Generando para ${dateStr}...`);
      
      const response = await fetch(`http://localhost:9002/api/cron/generate-cards?targetDay=${i}`);
      
      if (!response.ok) {
        console.error(`   ❌ Error generando para día +${i}:`, await response.text());
      } else {
        const result = await response.json();
        console.log(`   ✅ ${result.created} creadas, ${result.skipped} saltadas`);
      }
    }
    
    console.log('\n✅ Regeneración completada!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateClasses();
