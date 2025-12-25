const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
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
    
    console.log(`✅ Instructor: ${diego.name} (${diego.id})\n`);
    
    // Buscar TODAS las clases de Diego
    const allSlots = await prisma.$queryRaw`
      SELECT id, start, end, courtNumber, maxPlayers, level, totalPrice
      FROM TimeSlot 
      WHERE instructorId = ${diego.id}
      ORDER BY start ASC
    `;
    
    console.log(`📊 Total clases de Diego: ${allSlots.length}\n`);
    
    if (allSlots.length === 0) {
      console.log('❌ Diego no tiene ninguna clase asignada');
      return;
    }
    
    // Mostrar las primeras 10 clases
    const limit = Math.min(10, allSlots.length);
    console.log(`Mostrando las primeras ${limit} clases:\n`);
    
    for (let i = 0; i < limit; i++) {
      const slot = allSlots[i];
      const fecha = new Date(slot.start);
      const dia = fecha.toLocaleDateString('es-ES');
      const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`${i+1}. ${dia} ${hora}`);
      console.log(`   ID: ${slot.id}`);
      console.log(`   Pista: ${slot.courtNumber || 'NO ASIGNADA'}`);
      console.log(`   Nivel: ${slot.level}, MaxPlayers: ${slot.maxPlayers}, Precio: €${slot.totalPrice/100}\n`);
      
      // Ver bookings de esta clase
      const bookings = await prisma.booking.findMany({
        where: { timeSlotId: slot.id },
        select: { status: true, groupSize: true, isInstructorSubsidy: true }
      });
      
      const active = bookings.filter(b => b.status !== 'CANCELLED');
      if (active.length > 0) {
        console.log(`   📋 Bookings activos: ${active.length}`);
        active.forEach(b => {
          console.log(`      - GroupSize: ${b.groupSize}, IsSubsidy: ${b.isInstructorSubsidy}`);
        });
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
