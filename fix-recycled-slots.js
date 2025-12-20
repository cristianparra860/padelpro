const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRecycledSlots() {
  try {
    console.log('\n=== ARREGLANDO PLAZAS RECICLADAS ===\n');
    
    // Buscar todos los timeslots con hasRecycledSlots = true
    const slotsWithRecycled = await prisma.$queryRawUnsafe(`
      SELECT * FROM TimeSlot 
      WHERE hasRecycledSlots = 1
    `);
    
    console.log(`📊 Encontrados ${slotsWithRecycled.length} timeslots con hasRecycledSlots=true\n`);
    
    for (const slot of slotsWithRecycled) {
      console.log(`\n🔧 Procesando TimeSlot: ${slot.id}`);
      
      // Obtener bookings del slot
      const bookings = await prisma.booking.findMany({
        where: { timeSlotId: slot.id }
      });
      
      const recycledBookings = bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled);
      const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
      
      const maxPlayers = Number(slot.maxPlayers || 4);
      const availableRecycledSlots = Math.max(0, maxPlayers - activeBookings.length);
      
      console.log(`  📋 Bookings:`, {
        total: bookings.length,
        active: activeBookings.length,
        recycled: recycledBookings.length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length
      });
      
      console.log(`  ♻️  Calculado:`, {
        maxPlayers,
        availableRecycledSlots,
        recycledSlotsOnlyPoints: true
      });
      
      // Actualizar el timeslot
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: {
          availableRecycledSlots: availableRecycledSlots,
          recycledSlotsOnlyPoints: true
        }
      });
      
      console.log(`  ✅ TimeSlot actualizado`);
    }
    
    console.log('\n✅ TODOS LOS SLOTS ACTUALIZADOS\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRecycledSlots();
