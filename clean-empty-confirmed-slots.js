import { prisma } from './src/lib/prisma.ts';

async function cleanEmptyConfirmedSlots() {
  try {
    console.log('🧹 LIMPIANDO TIMESLOTS CONFIRMADOS SIN RESERVAS\n');
    
    // 1. Buscar TimeSlots con courtId pero sin bookings
    const allConfirmed = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
      },
      include: {
        bookings: true
      }
    });
    
    console.log(`📊 Total TimeSlots confirmados: ${allConfirmed.length}`);
    
    const emptySlots = allConfirmed.filter(ts => ts.bookings.length === 0);
    
    console.log(`⚠️ TimeSlots confirmados SIN reservas: ${emptySlots.length}\n`);
    
    if (emptySlots.length === 0) {
      console.log('✅ No hay TimeSlots vacíos para limpiar');
      await prisma.$disconnect();
      return;
    }
    
    console.log('📋 TimeSlots a limpiar:');
    emptySlots.forEach(slot => {
      const date = new Date(Number(slot.start));
      console.log(`   - ${date.toLocaleString('es-ES')} | Pista ${slot.courtNumber} | ${slot.level}`);
    });
    
    // 2. Opción 1: Eliminarlos completamente
    console.log('\n🗑️ ELIMINANDO TimeSlots vacíos...');
    
    for (const slot of emptySlots) {
      await prisma.timeSlot.delete({
        where: { id: slot.id }
      });
    }
    
    console.log(`✅ Eliminados: ${emptySlots.length} TimeSlots vacíos`);
    
    // 3. Verificar después
    const confirmedAfter = await prisma.timeSlot.count({
      where: {
        courtId: { not: null }
      }
    });
    
    console.log(`\n📊 TimeSlots confirmados restantes: ${confirmedAfter}`);
    
    if (confirmedAfter > 0) {
      const remaining = await prisma.timeSlot.findMany({
        where: {
          courtId: { not: null }
        },
        include: {
          bookings: true
        }
      });
      
      console.log('\n✅ TimeSlots confirmados CON reservas:');
      remaining.forEach(slot => {
        const date = new Date(Number(slot.start));
        console.log(`   - ${date.toLocaleString('es-ES')} | Pista ${slot.courtNumber} | ${slot.bookings.length} reservas`);
      });
    }
    
    console.log('\n✅ LIMPIEZA COMPLETA');
    console.log('💡 Calendario del club ahora solo mostrará clases con reservas reales');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanEmptyConfirmedSlots();
