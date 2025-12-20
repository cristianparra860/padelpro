const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enrollMarc() {
  try {
    console.log('📝 INSCRIBIENDO A MARC EN 3 CLASES\n');
    
    const marcId = 'user-1763677035576-wv1t7iun0';
    const today = '2025-12-05';
    
    // Buscar las 3 clases que acabamos de crear
    const slots = await prisma.$queryRaw`
      SELECT id, start
      FROM TimeSlot
      WHERE start LIKE ${today + '%'}
      AND courtId IS NULL
      ORDER BY start
      LIMIT 3
    `;
    
    if (slots.length < 3) {
      console.log('❌ No hay suficientes clases disponibles');
      return;
    }
    
    console.log(`✅ Encontradas ${slots.length} clases disponibles\n`);
    
    // Inscribir a Marc en cada clase con groupSize = 1
    const bookings = [];
    
    for (const slot of slots) {
      const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const time = new Date(slot.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      
      await prisma.booking.create({
        data: {
          id: bookingId,
          userId: marcId,
          timeSlotId: slot.id,
          groupSize: 1,
          status: 'PENDING',
          amountBlocked: 2500, // 25€
          paidWithPoints: false,
          pointsUsed: 0
        }
      });
      
      // Bloquear créditos
      await prisma.$executeRaw`
        UPDATE User
        SET blockedCredits = blockedCredits + 2500,
            updatedAt = datetime('now')
        WHERE id = ${marcId}
      `;
      
      bookings.push({ id: bookingId, time, slotId: slot.id });
      console.log(`✅ Inscrito en clase ${time} - Booking: ${bookingId}`);
      
      // Esperar un poco entre bookings para diferentes IDs
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log('\n✅ Marc inscrito en 3 clases del mismo día (2025-12-05)');
    console.log('   Estado: PENDING (sin pista asignada)');
    console.log('   Créditos bloqueados: 75€ (25€ x 3)\n');
    
    console.log('📋 Resumen de bookings:');
    bookings.forEach((b, i) => {
      console.log(`   ${i+1}. ${b.time} - ${b.id}`);
    });
    
    console.log('\n💡 Siguiente paso: Completar la primera clase con 3 jugadores más');
    console.log(`   Clase objetivo: ${bookings[0].time}`);
    console.log(`   TimeSlot: ${bookings[0].slotId}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

enrollMarc();
