const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  console.log('🔍 Verificación rápida del estado actual:\n');
  
  // Verificar todas las reservas CONFIRMED del 29 de noviembre
  const bookings = await prisma.$queryRaw`
    SELECT b.id, b.status, b.userId, ts.start, ts.courtNumber
    FROM Booking b
    JOIN TimeSlot ts ON b.timeSlotId = ts.id
    WHERE b.status = 'CONFIRMED'
    AND ts.start >= '2025-11-29T00:00:00.000Z'
    AND ts.start <= '2025-11-29T23:59:59.999Z'
    ORDER BY b.userId, ts.start
  `;
  
  console.log(`📊 Reservas CONFIRMED el 29 de noviembre: ${bookings.length}\n`);
  
  // Agrupar por usuario
  const byUser = {};
  for (const b of bookings) {
    if (!byUser[b.userId]) byUser[b.userId] = [];
    byUser[b.userId].push(b);
  }
  
  for (const [userId, userBookings] of Object.entries(byUser)) {
    console.log(`👤 ${userId}: ${userBookings.length} reservas`);
    for (const b of userBookings) {
      const time = new Date(Number(b.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   - ${time} (Pista ${b.courtNumber})`);
    }
    
    if (userBookings.length > 1) {
      console.log(`   ❌ VIOLACIÓN: Más de una reserva confirmada\n`);
    } else {
      console.log(`   ✅ Correcto\n`);
    }
  }
  
  await prisma.$disconnect();
}

quickCheck().catch(console.error);
