const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Buscando clase con Alex y Diego Martinez el 26 dic a las 9:00...\n');
    
    // Buscar Alex
    const alex = await prisma.user.findFirst({
      where: { name: { contains: 'Alex' } }
    });
    
    if (!alex) {
      console.log('❌ No se encontró a Alex');
      return;
    }
    
    console.log(`✅ Usuario Alex: ${alex.name} (${alex.id})`);
    
    // Buscar Diego
    const diego = await prisma.user.findFirst({
      where: { name: { contains: 'Diego' }, role: 'INSTRUCTOR' }
    });
    
    if (!diego) {
      console.log('❌ No se encontró a Diego');
      return;
    }
    
    console.log(`✅ Instructor Diego: ${diego.name} (${diego.id})\n`);
    
    // Buscar clases de Diego el 26 dic a las 9:00
    const date26 = new Date('2025-12-26T09:00:00.000Z');
    const timestamp = date26.getTime();
    
    const slots = await prisma.$queryRaw`
      SELECT id, start, end, courtNumber, maxPlayers, level, totalPrice, genderCategory
      FROM TimeSlot 
      WHERE instructorId = ${diego.id}
      AND start >= ${timestamp} 
      AND start < ${timestamp + 3600000}
      ORDER BY start ASC
    `;
    
    console.log(`📊 Clases de Diego el 26 dic a las 9:00: ${slots.length}\n`);
    
    if (slots.length === 0) {
      console.log('❌ No hay clases de Diego a esa hora');
      return;
    }
    
    // Revisar cada clase
    for (const slot of slots) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📅 CLASE: ${slot.id}`);
      console.log(`   Hora: ${new Date(slot.start).toLocaleTimeString('es-ES')}`);
      console.log(`   Pista: ${slot.courtNumber || '❌ NO ASIGNADA'}`);
      console.log(`   MaxPlayers: ${slot.maxPlayers}`);
      console.log(`   Nivel: ${slot.level}`);
      console.log(`   Precio: €${slot.totalPrice/100}`);
      console.log(`   Género: ${slot.genderCategory || 'Sin categoría'}`);
      
      // Buscar bookings de ALEX en esta clase
      const alexBookings = await prisma.booking.findMany({
        where: { 
          timeSlotId: slot.id,
          userId: alex.id
        },
        select: {
          id: true,
          status: true,
          groupSize: true,
          paidWithPoints: true,
          isInstructorSubsidy: true,
          amountBlocked: true
        }
      });
      
      if (alexBookings.length > 0) {
        console.log(`\n   👤 BOOKINGS DE ALEX: ${alexBookings.length}`);
        alexBookings.forEach(b => {
          console.log(`      - Status: ${b.status}`);
          console.log(`        GroupSize: ${b.groupSize}`);
          console.log(`        PaidWithPoints: ${b.paidWithPoints}`);
          console.log(`        Amount: ${b.amountBlocked} céntimos`);
          console.log(`        IsSubsidy: ${b.isInstructorSubsidy}`);
        });
      } else {
        console.log(`\n   ❌ Alex NO tiene bookings en esta clase`);
      }
      
      // Ver TODOS los bookings
      const allBookings = await prisma.booking.findMany({
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
      
      console.log(`\n   📋 TODOS LOS BOOKINGS: ${allBookings.length}`);
      allBookings.forEach((b, i) => {
        console.log(`      ${i+1}. ${b.user.name}`);
        console.log(`         Status: ${b.status}, GroupSize: ${b.groupSize}`);
        console.log(`         Points: ${b.paidWithPoints}, Subsidy: ${b.isInstructorSubsidy}`);
      });
      
      const active = allBookings.filter(b => b.status !== 'CANCELLED');
      const totalPlayers = active.reduce((sum, b) => sum + b.groupSize, 0);
      console.log(`\n   ✅ Total jugadores activos: ${totalPlayers}/${slot.maxPlayers}`);
      
      // Ver CreditSlots
      const credits = await prisma.creditSlot.findMany({
        where: { timeSlotId: slot.id }
      });
      
      if (credits.length > 0) {
        console.log(`\n   💳 CREDIT SLOTS CONVERTIDOS: ${credits.length}`);
        credits.forEach(c => {
          console.log(`      - SlotIndex: ${c.slotIndex}`);
          console.log(`        AvailableCount: ${c.availableCount}`);
          console.log(`        PointsCost: ${c.pointsCost}`);
        });
      } else {
        console.log(`\n   ℹ️  No hay slots convertidos a puntos`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
