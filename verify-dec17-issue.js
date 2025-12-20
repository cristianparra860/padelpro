const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingsDecember17() {
  try {
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id, 
        b.status, 
        b.groupSize, 
        b.userId, 
        u.name, 
        ts.start, 
        ts.courtNumber,
        ts.id as timeSlotId
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      JOIN User u ON b.userId = u.id
      WHERE ts.start >= '2025-12-17T00:00:00Z' 
      AND ts.start < '2025-12-18T00:00:00Z'
      ORDER BY u.name, ts.start
    `;

    console.log('\n📅 INSCRIPCIONES DEL 17 DE DICIEMBRE:\n');

    const grouped = {};
    bookings.forEach(b => {
      if (!grouped[b.name]) grouped[b.name] = [];
      grouped[b.name].push(b);
    });

    Object.entries(grouped).forEach(([name, bks]) => {
      console.log(`\n👤 ${name} (${bks[0].userId}):`);
      bks.forEach(b => {
        const time = new Date(b.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
        const court = b.courtNumber ? `Pista ${b.courtNumber}` : '❌ SIN PISTA';
        const icon = b.status === 'CONFIRMED' ? '✅' : '⏳';
        console.log(`   ${icon} ${time} - ${b.status} - ${court} (Booking: ${b.id})`);
      });
      
      const confirmed = bks.filter(b => b.status === 'CONFIRMED' && b.courtNumber !== null);
      const pending = bks.filter(b => b.status === 'PENDING' || b.courtNumber === null);
      
      if (confirmed.length > 0 && pending.length > 0) {
        console.log(`   ⚠️  PROBLEMA: Tiene ${confirmed.length} reserva(s) confirmada(s) Y ${pending.length} inscripción(es) pendiente(s)`);
      }
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkBookingsDecember17();
