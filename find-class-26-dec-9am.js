const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Buscar clase del 26 a las 9:00 en Padel Estrella
    const date26 = new Date('2025-12-26T09:00:00.000Z');
    const timestamp = date26.getTime();
    
    console.log('🔍 Buscando clases el 26 dic a las 9:00 en Padel Estrella...\n');
    
    const slots = await prisma.$queryRaw`
      SELECT t.id, t.start, t.courtNumber, t.maxPlayers, t.level, t.instructorId,
             u.name as instructorName, t.clubId
      FROM TimeSlot t
      JOIN User u ON t.instructorId = u.id
      WHERE t.start >= ${timestamp} 
      AND t.start < ${timestamp + 3600000}
      ORDER BY t.start ASC
    `;
    
    console.log(`📊 Clases encontradas: ${slots.length}\n`);
    
    for (const slot of slots) {
      console.log(`Clase: ${slot.id}`);
      console.log(`  Instructor: ${slot.instructorName} (${slot.instructorId})`);
      console.log(`  Hora: ${new Date(slot.start).toLocaleTimeString('es-ES')}`);
      console.log(`  Pista: ${slot.courtNumber || 'NO ASIGNADA'}`);
      console.log(`  MaxPlayers: ${slot.maxPlayers}`);
      
      // Ver bookings
      const bookings = await prisma.booking.findMany({
        where: { timeSlotId: slot.id },
        select: {
          id: true,
          status: true,
          groupSize: true,
          isInstructorSubsidy: true,
          paidWithPoints: true,
          user: { select: { name: true } }
        }
      });
      
      console.log(`  \n📋 Total bookings: ${bookings.length}`);
      bookings.forEach((b, i) => {
        console.log(`    ${i+1}. ${b.user.name}`);
        console.log(`       Status: ${b.status}, GroupSize: ${b.groupSize}`);
        console.log(`       IsSubsidy: ${b.isInstructorSubsidy}, Points: ${b.paidWithPoints}`);
      });
      
      const active = bookings.filter(b => b.status !== 'CANCELLED');
      const totalPlayers = active.reduce((sum, b) => sum + b.groupSize, 0);
      console.log(`  \n✅ Jugadores activos: ${totalPlayers}/${slot.maxPlayers}`);
      
      // Ver CreditSlots
      const credits = await prisma.creditSlot.findMany({
        where: { timeSlotId: slot.id }
      });
      
      if (credits.length > 0) {
        console.log(`  \n💳 CreditSlots convertidos:`);
        credits.forEach(c => {
          console.log(`    - SlotIndex: ${c.slotIndex}, Available: ${c.availableCount}, Cost: ${c.pointsCost} pts`);
        });
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
