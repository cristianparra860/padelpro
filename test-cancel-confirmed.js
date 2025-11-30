const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancelConfirmed() {
  try {
    console.log('=== TESTING CANCEL CONFIRMED BOOKING ===\n');
    
    // 1. Buscar una reserva CONFIRMED
    const confirmedBooking = await prisma.$queryRaw`
      SELECT b.id, b.userId, b.timeSlotId, b.status, b.amountBlocked, b.groupSize,
             u.name as userName, u.credits, u.points,
             t.start, t.courtNumber
      FROM Booking b
      JOIN User u ON b.userId = u.id
      JOIN TimeSlot t ON b.timeSlotId = t.id
      WHERE b.status = 'CONFIRMED'
      ORDER BY t.start DESC
      LIMIT 1
    `;
    
    if (confirmedBooking.length === 0) {
      console.log('❌ No hay reservas CONFIRMED para probar');
      await prisma.$disconnect();
      return;
    }
    
    const booking = confirmedBooking[0];
    console.log('📋 Reserva CONFIRMED encontrada:');
    console.log(`  ID: ${booking.id}`);
    console.log(`  Usuario: ${booking.userName}`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  AmountBlocked: €${booking.amountBlocked}`);
    console.log(`  Créditos actuales: €${booking.credits}`);
    console.log(`  Puntos actuales: ${booking.points}`);
    console.log(`  Fecha clase: ${new Date(Number(booking.start)).toLocaleString()}`);
    console.log(`  Pista asignada: ${booking.courtNumber || 'ninguna'}`);
    
    console.log('\n✅ RESULTADO ESPERADO:');
    console.log(`  - Booking cambia a CANCELLED`);
    console.log(`  - Booking.isRecycled = true`);
    console.log(`  - Usuario recibe ${Math.floor(booking.amountBlocked)} puntos`);
    console.log(`  - Créditos NO cambian (se otorgan puntos, no se devuelve dinero)`);
    console.log(`  - TimeSlot.hasRecycledSlots = true`);
    
    console.log('\n📊 Ahora prueba cancelar desde la interfaz y veremos si funciona correctamente.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancelConfirmed();
