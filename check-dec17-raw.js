const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDec17Raw() {
  // Buscar TimeSlots del 17 de diciembre
  const timeSlots = await prisma.$queryRaw`
    SELECT id, start, level, courtId FROM TimeSlot
    WHERE date(start) = '2025-12-17'
    LIMIT 5
  `;
  
  console.log('TimeSlots for Dec 17:', timeSlots.length);
  
  if (timeSlots.length > 0) {
    const tsId = timeSlots[0].id;
    console.log('First TimeSlot:', tsId);
    
    // Buscar bookings para ese TimeSlot
    const bookings = await prisma.$queryRaw`
      SELECT * FROM Booking
      WHERE timeSlotId = ${tsId}
    `;
    
    console.log('Bookings for first TimeSlot:', bookings.length);
    
    // Buscar TODOS los bookings de diciembre 17
    const allBookings = await prisma.$queryRaw`
      SELECT b.*, t.start
      FROM Booking b
      JOIN TimeSlot t ON b.timeSlotId = t.id
      WHERE date(t.start) = '2025-12-17'
      AND b.status != 'CANCELLED'
    `;
    
    console.log('\nAll bookings for Dec 17:', allBookings.length);
    allBookings.forEach(b => {
      console.log(`  Booking: ${b.id.substring(0, 20)}...`);
      console.log(`  User: ${b.userId}`);
      console.log(`  TimeSlot start: ${b.start}`);
      console.log(`  Status: ${b.status}`);
      console.log(`  GroupSize: ${b.groupSize}`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

checkDec17Raw();
