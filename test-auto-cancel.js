const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAutoCancellation() {
  try {
    console.log('🧪 TEST: Auto-cancelación de reservas del mismo día\n');
    
    // 1. Obtener ID de Marc
    const marc = await prisma.user.findFirst({
      where: { email: 'marc.parra@padelpro.com' }
    });
    
    if (!marc) {
      console.log('❌ Usuario Marc no encontrado');
      return;
    }
    
    console.log('✅ Usuario Marc encontrado:');
    console.log('   ID:', marc.id);
    console.log('   Créditos:', marc.credits / 100, '€');
    console.log('   Puntos:', marc.points);
    console.log('');
    
    // 2. Buscar clases disponibles hoy
    const today = '2025-12-05';
    const slots = await prisma.$queryRaw`
      SELECT ts.id, ts.start, ts.instructorId, ts.courtNumber, COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status = 'PENDING'
      WHERE ts.start LIKE ${today + '%'}
      AND ts.courtId IS NULL
      GROUP BY ts.id
      ORDER BY ts.start
      LIMIT 10
    `;
    
    console.log(`📅 Clases disponibles hoy (${today}):`);
    console.log('   Total encontradas:', slots.length);
    
    if (slots.length > 0) {
      slots.forEach((s, i) => {
        const time = new Date(s.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        console.log(`   ${i+1}. ${time} - ID: ${s.id.substring(0,30)}... - Inscritos: ${s.bookingCount}/4`);
      });
    } else {
      console.log('   ⚠️ No hay clases disponibles hoy');
    }
    console.log('');
    
    // 3. Ver reservas actuales de Marc hoy
    const marcBookings = await prisma.$queryRaw`
      SELECT b.id, b.status, ts.start, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marc.id}
      AND ts.start LIKE ${today + '%'}
      ORDER BY ts.start
    `;
    
    console.log(`📋 Reservas actuales de Marc hoy:`);
    console.log('   Total:', marcBookings.length);
    
    if (marcBookings.length > 0) {
      marcBookings.forEach((b, i) => {
        const time = new Date(b.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        const court = b.courtNumber ? `Pista ${b.courtNumber}` : 'Sin pista';
        console.log(`   ${i+1}. ${time} - ${b.status} - ${court}`);
      });
    } else {
      console.log('   ℹ️ No tiene reservas hoy');
    }
    
    console.log('\n💡 Para probar la auto-cancelación:');
    console.log('   1. Inscribe a Marc en 2-3 clases diferentes del mismo día');
    console.log('   2. Completa una de esas clases con otros 3 usuarios');
    console.log('   3. La función cancelOtherBookingsOnSameDay() se ejecutará automáticamente');
    console.log('   4. Las otras reservas de Marc se cancelarán y liberarán sus créditos/puntos');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoCancellation();
