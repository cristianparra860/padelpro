const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBatchAPI() {
  const userId = 'cmhkwi8so0001tggo0bwojrjy'; // Alex Garcia
  const startDate = '2025-11-15';
  const endDate = '2025-11-17';

  console.log('🔍 Testing batch API logic...');
  console.log(`📅 Date range: ${startDate} to ${endDate}`);
  console.log(`👤 User: ${userId}\n`);

  // Convertir fechas a timestamps (milisegundos desde epoch)
  const startTimestamp = new Date(startDate + 'T00:00:00.000Z').getTime();
  const endTimestamp = new Date(endDate + 'T23:59:59.999Z').getTime();
  
  console.log('🕐 Timestamps:');
  console.log(`   Start: ${startTimestamp} (${new Date(startTimestamp).toISOString()})`);
  console.log(`   End: ${endTimestamp} (${new Date(endTimestamp).toISOString()})\n`);

  // Query con timestamps
  const classBookings = await prisma.$queryRaw`
    SELECT 
      b.id,
      b.status,
      b.userId,
      ts.start,
      ts.end,
      ts.courtNumber
    FROM Booking b
    JOIN TimeSlot ts ON b.timeSlotId = ts.id
    WHERE b.userId = ${userId}
    AND (b.status = 'CONFIRMED' OR b.status = 'PENDING')
    AND ts.start >= ${startTimestamp}
    AND ts.start <= ${endTimestamp}
    ORDER BY ts.start
  `;

  console.log(`📚 Total bookings found: ${classBookings.length}\n`);

  // Agrupar por fecha
  const bookingsByDate = {};
  
  classBookings.forEach(booking => {
    const bookingDate = new Date(Number(booking.start));
    const dateKey = bookingDate.toISOString().substring(0, 10);
    
    if (!bookingsByDate[dateKey]) {
      bookingsByDate[dateKey] = [];
    }
    bookingsByDate[dateKey].push(booking);
  });

  console.log('📊 Bookings by date:');
  Object.keys(bookingsByDate).sort().forEach(date => {
    const bookings = bookingsByDate[date];
    const confirmed = bookings.filter(b => b.courtNumber !== null).length;
    const pending = bookings.filter(b => b.courtNumber === null).length;
    
    console.log(`\n   ${date}:`);
    console.log(`      Total: ${bookings.length}`);
    console.log(`      Confirmed: ${confirmed} (courtNumber != null)`);
    console.log(`      Pending: ${pending} (courtNumber == null)`);
    
    bookings.forEach(b => {
      const time = new Date(Number(b.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`      - ${time}: ${b.status}, Court: ${b.courtNumber || 'N/A'}`);
    });
  });

  await prisma.$disconnect();
}

testBatchAPI().catch(console.error);
