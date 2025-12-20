const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeMarc() {
  try {
    console.log('🔍 ANÁLISIS DE RESERVAS CONFIRMADAS - MARC\n');
    
    const marc = await prisma.user.findUnique({
      where: { id: 'user-1763677035576-wv1t7iun0' }
    });
    
    if (!marc) {
      console.log('❌ Marc no encontrado');
      return;
    }
    
    console.log('👤 Usuario:', marc.name);
    console.log('📧 Email:', marc.email);
    console.log('🆔 ID:', marc.id, '\n');
    
    // Buscar TODAS las reservas CONFIRMED
    const confirmed = await prisma.$queryRaw`
      SELECT 
        b.id as bookingId,
        b.status,
        b.createdAt,
        ts.id as slotId,
        ts.start,
        ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marc.id}
      AND b.status = 'CONFIRMED'
      ORDER BY ts.start
    `;
    
    console.log(`📊 Total reservas CONFIRMED: ${confirmed.length}\n`);
    
    if (confirmed.length === 0) {
      console.log('ℹ️ No tiene reservas confirmadas');
      return;
    }
    
    // Agrupar por día
    const days = {};
    confirmed.forEach(b => {
      const date = new Date(b.start);
      const dayKey = date.toISOString().split('T')[0];
      
      if (!days[dayKey]) {
        days[dayKey] = [];
      }
      
      days[dayKey].push({
        time: date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'}),
        court: b.courtNumber || 'N/A',
        bookingId: b.bookingId.substring(0, 30),
        slotId: b.slotId.substring(0, 30)
      });
    });
    
    // Mostrar por día
    console.log('📅 RESERVAS POR DÍA:\n');
    for (const [day, bookings] of Object.entries(days)) {
      const count = bookings.length;
      const icon = count > 1 ? '⚠️' : '✅';
      
      console.log(`${icon} ${day} - ${count} reserva(s):`);
      bookings.forEach((b, i) => {
        console.log(`   ${i+1}. ${b.time} - Pista ${b.court}`);
        console.log(`      Booking: ${b.bookingId}...`);
      });
      
      if (count > 1) {
        console.log(`   ❌ PROBLEMA: ${count} reservas confirmadas el mismo día`);
        console.log(`   ⚠️ Solo se permite 1 por día según la norma`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeMarc();
