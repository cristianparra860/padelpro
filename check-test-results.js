const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestResults() {
  try {
    console.log('🔍 VERIFICANDO RESULTADOS DE LA PRUEBA\n');
    
    const marcId = 'user-1763677035576-wv1t7iun0';
    
    // Buscar TODAS las reservas de Marc (cualquier fecha)
    const allBookings = await prisma.booking.findMany({
      where: { userId: marcId },
      include: { timeSlot: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Últimas 10 reservas de Marc:\n`);
    
    allBookings.forEach((b, i) => {
      const date = new Date(b.timeSlot.start);
      const dateStr = date.toLocaleDateString('es-ES');
      const timeStr = date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      const court = b.timeSlot.courtNumber ? `Pista ${b.timeSlot.courtNumber}` : 'Sin pista';
      const icon = b.status === 'CONFIRMED' ? '✅' : b.status === 'CANCELLED' ? '❌' : '⏳';
      
      console.log(`${icon} ${i+1}. ${dateStr} ${timeStr} - ${b.status} - ${court}`);
      console.log(`   Booking: ${b.id}`);
      console.log(`   TimeSlot: ${b.timeSlotId}`);
    });
    
    // Contar reservas de hoy (2025-12-05)
    const todayStart = new Date('2025-12-05T00:00:00Z');
    const todayEnd = new Date('2025-12-06T00:00:00Z');
    
    const todayBookings = allBookings.filter(b => {
      const slotDate = new Date(b.timeSlot.start);
      return slotDate >= todayStart && slotDate < todayEnd;
    });
    
    console.log(`\n📅 Reservas del 2025-12-05: ${todayBookings.length}`);
    
    if (todayBookings.length > 0) {
      const confirmed = todayBookings.filter(b => b.status === 'CONFIRMED').length;
      const cancelled = todayBookings.filter(b => b.status === 'CANCELLED').length;
      const pending = todayBookings.filter(b => b.status === 'PENDING').length;
      
      console.log(`   ✅ CONFIRMED: ${confirmed}`);
      console.log(`   ❌ CANCELLED: ${cancelled}`);
      console.log(`   ⏳ PENDING: ${pending}`);
      
      if (confirmed === 1 && cancelled >= 2) {
        console.log('\n🎉 ¡AUTO-CANCELACIÓN FUNCIONÓ!');
      } else if (confirmed > 1) {
        console.log('\n⚠️ PROBLEMA: Más de 1 reserva confirmada el mismo día');
      } else {
        console.log('\n📝 Estado actual registrado');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestResults();
