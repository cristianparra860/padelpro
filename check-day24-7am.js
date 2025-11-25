const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay24() {
  const ts = new Date('2025-11-24T07:00:00').getTime();
  
  const slots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${ts}
    ORDER BY i.name, ts.level DESC
  `);
  
  console.log(`📅 DÍA 24 A LAS 7:00 - Total: ${slots.length} tarjetas\n`);
  
  const byInstructor = {};
  slots.forEach(s => {
    if (!byInstructor[s.instructorName]) byInstructor[s.instructorName] = [];
    byInstructor[s.instructorName].push(s);
  });
  
  Object.entries(byInstructor).forEach(([inst, cards]) => {
    console.log(`👨‍🏫 ${inst}: ${cards.length} tarjeta(s)`);
    cards.forEach(s => {
      console.log(`   ${s.level.padEnd(15)} | ${(s.genderCategory||'N/A').padEnd(10)} | Pista: ${s.courtNumber||'N/A'} | ${s.bookingCount} reserva(s)`);
    });
    console.log();
  });
  
  prisma.$disconnect();
}

checkDay24();
