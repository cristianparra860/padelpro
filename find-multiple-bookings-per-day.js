const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMultipleBookingsPerDay() {
  try {
    console.log('\n🔍 BUSCANDO DÍAS CON MÚLTIPLES INSCRIPCIONES POR USUARIO:\n');
    
    // Buscar usuario Marc
    const marc = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' },
      select: { id: true, name: true, email: true }
    });
    
    if (!marc) {
      console.log('❌ Usuario no encontrado');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`👤 Usuario: ${marc.name} (${marc.email})\n`);
    
    // Obtener todas sus inscripciones activas
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        b.groupSize,
        ts.start,
        ts.courtNumber,
        ts.id as timeSlotId
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marc.id}
      AND b.status IN ('PENDING', 'CONFIRMED')
      ORDER BY ts.start
    `;
    
    console.log(`📊 Total de inscripciones activas: ${bookings.length}\n`);
    
    // Agrupar por día
    const byDay = {};
    bookings.forEach(b => {
      const date = new Date(b.start).toISOString().split('T')[0];
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(b);
    });
    
    // Mostrar días con múltiples inscripciones
    Object.entries(byDay).forEach(([date, bks]) => {
      if (bks.length > 1) {
        console.log(`\n📅 ${date} - ${bks.length} inscripciones:`);
        bks.forEach(b => {
          const time = new Date(b.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
          const court = b.courtNumber ? `Pista ${b.courtNumber}` : '❌ SIN PISTA';
          const icon = b.status === 'CONFIRMED' ? '✅' : '⏳';
          console.log(`   ${icon} ${time} - ${b.status} - ${court}`);
        });
        
        const confirmed = bks.filter(b => b.status === 'CONFIRMED' && b.courtNumber !== null);
        const pending = bks.filter(b => b.status === 'PENDING' || b.courtNumber === null);
        
        if (confirmed.length > 0 && pending.length > 0) {
          console.log(`   ⚠️  PROBLEMA DETECTADO: ${confirmed.length} confirmada(s) + ${pending.length} pendiente(s)`);
        }
      }
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

findMultipleBookingsPerDay();
