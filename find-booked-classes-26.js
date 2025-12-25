const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const date26Start = new Date('2025-12-26T00:00:00.000Z');
    const date26End = new Date('2025-12-27T00:00:00.000Z');
    
    console.log('🔍 Buscando TODAS las clases del 26 diciembre con reservas activas...\n');
    
    const slots = await prisma.$queryRaw`
      SELECT t.id, t.start, t.courtNumber, t.maxPlayers, t.level, t.instructorId,
             u.name as instructorName
      FROM TimeSlot t
      JOIN User u ON t.instructorId = u.id
      WHERE t.start >= ${date26Start.getTime()} 
      AND t.start < ${date26End.getTime()}
      ORDER BY t.start ASC
    `;
    
    console.log(`📊 Total clases el 26 dic: ${slots.length}\n`);
    
    for (const slot of slots) {
      const hora = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      // Ver bookings
      const bookings = await prisma.booking.findMany({
        where: { timeSlotId: slot.id },
        select: {
          id: true,
          status: true,
          groupSize: true,
          isInstructorSubsidy: true,
          user: { select: { name: true } }
        }
      });
      
      const active = bookings.filter(b => b.status !== 'CANCELLED');
      
      // Solo mostrar clases con bookings activos
      if (active.length > 0) {
        console.log(`⏰ ${hora} - ${slot.instructorName}`);
        console.log(`   ID: ${slot.id}`);
        console.log(`   Max: ${slot.maxPlayers}, Pista: ${slot.courtNumber || 'NO ASIGNADA'}`);
        console.log(`   Bookings activos: ${active.length}`);
        
        active.forEach((b) => {
          console.log(`     • ${b.user.name} - GroupSize: ${b.groupSize}, Subsidy: ${b.isInstructorSubsidy}`);
        });
        
        // Ver CreditSlots
        const credits = await prisma.creditSlot.findMany({
          where: { timeSlotId: slot.id }
        });
        
        if (credits.length > 0) {
          console.log(`   💳 Slots convertidos a puntos:`);
          credits.forEach(c => {
            console.log(`      - SlotIndex ${c.slotIndex}: ${c.availableCount} disponibles, ${c.pointsCost} pts`);
          });
        }
        
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
