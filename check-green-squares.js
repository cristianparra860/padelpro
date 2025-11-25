import { prisma } from './src/lib/prisma.ts';

async function checkGreenSquares() {
  try {
    console.log('🟢 REVISANDO RECUADROS VERDES (Propuestas)\n');
    
    // Días específicos mencionados: 25, 28 nov y 1 dic
    const days = [
      '2025-11-25',
      '2025-11-28',
      '2025-12-01'
    ];
    
    for (const date of days) {
      console.log(`\n📅 ${date}:`);
      
      const startDay = new Date(`${date}T00:00:00.000Z`).getTime();
      const endDay = new Date(`${date}T23:59:59.999Z`).getTime();
      
      // Propuestas (courtId = NULL)
      const proposals = await prisma.$queryRawUnsafe(`
        SELECT 
          ts.id,
          ts.start,
          ts.courtId,
          ts.level,
          ts.genderCategory,
          i.name as instructorName,
          COUNT(b.id) as bookingCount
        FROM TimeSlot ts
        LEFT JOIN Instructor i ON ts.instructorId = i.id
        LEFT JOIN Booking b ON ts.id = b.timeSlotId
        WHERE ts.start >= ? AND ts.start <= ?
        AND ts.courtId IS NULL
        GROUP BY ts.id
        ORDER BY ts.start ASC
      `, startDay, endDay);
      
      console.log(`   🟢 Total propuestas: ${proposals.length}`);
      
      if (proposals.length > 0) {
        console.log('\n   Detalle:');
        proposals.forEach(p => {
          const time = new Date(Number(p.start)).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Madrid'
          });
          console.log(`      ${time} | ${p.instructorName || 'Sin instructor'} | ${p.level} | ${p.genderCategory} | Bookings: ${p.bookingCount}`);
        });
      }
      
      // Confirmadas (courtId asignado)
      const confirmed = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM TimeSlot
        WHERE start >= ? AND start <= ?
        AND courtId IS NOT NULL
      `, startDay, endDay);
      
      console.log(`\n   🔵 Confirmadas: ${confirmed[0].count}`);
    }
    
    // Ver todos los TimeSlots con courtId asignado en próximos 30 días
    console.log('\n\n🔵 TODAS LAS CLASES CONFIRMADAS (próximos 30 días):\n');
    
    const today = new Date().getTime();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const limitDate = in30Days.getTime();
    
    const allConfirmed = await prisma.$queryRawUnsafe(`
      SELECT 
        ts.id,
        ts.start,
        ts.courtId,
        ts.courtNumber,
        ts.level,
        ts.genderCategory,
        i.name as instructorName,
        COUNT(b.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      LEFT JOIN Booking b ON ts.id = b.timeSlotId
      WHERE ts.start >= ? AND ts.start <= ?
      AND ts.courtId IS NOT NULL
      GROUP BY ts.id
      ORDER BY ts.start ASC
    `, today, limitDate);
    
    console.log(`Total: ${allConfirmed.length} clases confirmadas\n`);
    
    allConfirmed.forEach(c => {
      const date = new Date(Number(c.start));
      const dateStr = date.toLocaleDateString('es-ES');
      const time = date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid'
      });
      console.log(`   ${dateStr} ${time} | Pista ${c.courtNumber} | ${c.instructorName} | ${c.level} | Bookings: ${c.bookingCount}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGreenSquares();
