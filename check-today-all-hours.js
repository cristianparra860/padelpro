const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToday() {
  console.log('📅 VERIFICANDO TARJETAS DE HOY (24 de noviembre 2025)\n');
  
  // Rango del día 24
  const startOfDay = new Date('2025-11-24T00:00:00').getTime();
  const endOfDay = new Date('2025-11-25T00:00:00').getTime();
  
  const allSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start >= ${startOfDay} AND ts.start < ${endOfDay}
    ORDER BY ts.start, i.name
  `);
  
  console.log(`📊 Total tarjetas del día 24: ${allSlots.length}\n`);
  
  // Agrupar por hora
  const byHour = {};
  allSlots.forEach(s => {
    const date = new Date(Number(s.start));
    const hour = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(s);
  });
  
  Object.entries(byHour).forEach(([hour, slots]) => {
    console.log(`⏰ ${hour} - ${slots.length} tarjeta(s):`);
    
    const byInst = {};
    slots.forEach(s => {
      if (!byInst[s.instructorName]) byInst[s.instructorName] = [];
      byInst[s.instructorName].push(s);
    });
    
    Object.entries(byInst).forEach(([inst, cards]) => {
      if (cards.length > 1) {
        console.log(`   👨‍🏫 ${inst}: ${cards.length} tarjetas`);
        cards.forEach(c => console.log(`      • ${c.level}/${c.genderCategory || 'N/A'} (${c.bookingCount} reservas)`));
      } else {
        console.log(`   👨‍🏫 ${inst}: ${cards[0].level}/${cards[0].genderCategory || 'N/A'} (${cards[0].bookingCount} reservas)`);
      }
    });
    console.log();
  });
  
  prisma.$disconnect();
}

checkToday();
