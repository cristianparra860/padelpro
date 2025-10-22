// check-bookings-day-17.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingsDay17() {
  try {
    console.log('🔍 Buscando reservas para el día 17 de octubre 2025...\n');
    
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.status,
        b.groupSize,
        ts.start,
        ts.end,
        ts.courtNumber,
        ts.level,
        ts.category
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = 'cmge3nlkv0001tg30p0pw8hdm'
      AND ts.start LIKE '2025-10-17%'
    `;
    
    console.log(`📚 Encontradas ${bookings.length} reservas para el día 17:`);
    console.log(JSON.stringify(bookings, null, 2));
    
    if (bookings.length > 0) {
      const withCourt = bookings.filter(b => b.courtNumber !== null);
      const withoutCourt = bookings.filter(b => b.courtNumber === null);
      
      console.log(`\n✅ Con pista asignada: ${withCourt.length}`);
      console.log(`⏳ Sin pista asignada: ${withoutCourt.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingsDay17();
