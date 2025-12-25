const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Buscando instructor Diego...');
    const diego = await prisma.user.findFirst({
      where: { 
        name: { contains: 'Diego' }, 
        role: 'INSTRUCTOR' 
      }
    });
    
    if (!diego) {
      console.log('❌ No se encontró a Diego');
      return;
    }
    
    console.log(`✅ Instructor: ${diego.name} (${diego.id})`);
    
    const date26 = new Date('2025-12-26T09:00:00.000Z');
    const timestamp = date26.getTime();
    
    const slots = await prisma.$queryRaw`
      SELECT id, start, courtNumber, maxPlayers, level 
      FROM TimeSlot 
      WHERE instructorId = ${diego.id} 
      AND start >= ${timestamp} 
      AND start < ${timestamp + 3600000}
    `;
    
    if (slots.length === 0) {
      console.log('❌ No se encontraron clases');
      return;
    }
    
    const slot = slots[0];
    console.log(`\n📅 Clase encontrada:`);
    console.log(`  ID: ${slot.id}`);
    console.log(`  Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
    console.log(`  Pista: ${slot.courtNumber || 'NO ASIGNADA'}`);
    console.log(`  Max jugadores: ${slot.maxPlayers}`);
    
    // Verificar bookings
    const bookings = await prisma.booking.findMany({
      where: { timeSlotId: slot.id },
      select: {
        id: true,
        status: true,
        groupSize: true,
        isInstructorSubsidy: true,
        paidWithPoints: true
      }
    });
    
    console.log(`\n📊 Total bookings: ${bookings.length}`);
    bookings.forEach((b, i) => {
      console.log(`  ${i+1}. Status: ${b.status}, GroupSize: ${b.groupSize}, IsSubsidy: ${b.isInstructorSubsidy}, Points: ${b.paidWithPoints}`);
    });
    
    const active = bookings.filter(b => b.status !== 'CANCELLED');
    console.log(`\n✅ Bookings ACTIVOS: ${active.length}`);
    
    const totalPlayers = active.reduce((sum, b) => sum + b.groupSize, 0);
    console.log(`👥 Total jugadores activos: ${totalPlayers}/${slot.maxPlayers}`);
    
    // Verificar CreditSlots
    const credits = await prisma.creditSlot.findMany({
      where: { timeSlotId: slot.id }
    });
    
    console.log(`\n💳 CreditSlots: ${credits.length}`);
    credits.forEach(c => {
      console.log(`  SlotIndex: ${c.slotIndex}, AvailableCount: ${c.availableCount}, PointsCost: ${c.pointsCost}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
