const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const userId = 'alex-garcia-789';
    
    console.log('🔍 INVESTIGANDO DESINCRONIZACIÓN\n');
    
    // 1. Ver todas las bookings del usuario
    const allBookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        timeSlot: {
          select: { 
            id: true,
            start: true, 
            courtNumber: true,
            level: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📋 TODAS LAS BOOKINGS de Alex Garcia:');
    console.log('Total:', allBookings.length);
    allBookings.forEach(b => {
      const d = new Date(b.timeSlot.start);
      console.log(`  - ${b.status} | ${d.toLocaleString('es-ES')} | Pista: ${b.timeSlot.courtNumber || 'SIN ASIGNAR'} | Level: ${b.timeSlot.level}`);
    });
    
    // 2. Ver clases confirmadas (con pista asignada)
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        courtNumber: { not: null },
        start: { gte: new Date() }
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      },
      take: 5
    });
    
    console.log('\n🟢 CLASES CONFIRMADAS (con pista):');
    console.log('Total:', confirmedClasses.length);
    confirmedClasses.forEach(c => {
      const d = new Date(c.start);
      console.log(`  - Pista ${c.courtNumber} | ${d.toLocaleString('es-ES')} | ${c.level} | Bookings activas: ${c.bookings.length}`);
      c.bookings.forEach(b => {
        console.log(`    • ${b.userId.substring(0, 15)}... | ${b.status} | groupSize: ${b.groupSize}`);
      });
    });
    
    // 3. Verificar qué devuelve el API /api/my/bookings
    console.log('\n📡 SIMULACIÓN API /api/my/bookings:');
    const apiBookings = await prisma.booking.findMany({
      where: {
        userId,
        status: 'CONFIRMED'
      },
      include: {
        timeSlot: {
          select: {
            start: true,
            courtNumber: true
          }
        }
      }
    });
    
    console.log('Bookings que devolvería el API:', apiBookings.length);
    apiBookings.forEach(b => {
      const d = new Date(b.timeSlot.start);
      const isPast = d < new Date();
      console.log(`  - ${d.toLocaleString('es-ES')} | Pista: ${b.timeSlot.courtNumber} | ${isPast ? '⏰ PASADA' : '✅ FUTURA'}`);
    });
    
    // 4. Ver si hay bookings fantasma (sin usuario válido)
    const orphanBookings = await prisma.$queryRawUnsafe(`
      SELECT b.*, t.start, t.courtNumber 
      FROM Booking b
      JOIN TimeSlot t ON b.timeSlotId = t.id
      WHERE b.status IN ('PENDING', 'CONFIRMED')
      AND t.courtNumber IS NOT NULL
      AND b.userId NOT IN (SELECT id FROM User)
      LIMIT 5
    `);
    
    console.log('\n👻 BOOKINGS HUÉRFANAS (sin usuario válido):');
    console.log('Total:', orphanBookings.length);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
