const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCristianClassesDec6() {
  try {
    const dec6Start = new Date('2025-12-06T00:00:00.000Z').getTime();
    const dec6End = new Date('2025-12-06T23:59:59.999Z').getTime();
    
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.level,
        ts.levelRange,
        i.name as instructor,
        i.levelRanges,
        (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookings
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start >= ${dec6Start}
        AND ts.start <= ${dec6End}
        AND i.name = 'Cristian Parra'
      ORDER BY ts.start
    `;
    
    console.log('🔍 Clases de Cristian Parra el 6/12:\n');
    
    for (const s of slots) {
      const time = new Date(Number(s.start)).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      console.log(`${time}h | Level: "${s.level}" | Bookings: ${s.bookings}`);
      
      // Si hay bookings, buscar el nivel del primer usuario
      if (Number(s.bookings) > 0) {
        const firstBooking = await prisma.$queryRaw`
          SELECT u.level as userLevel, u.name as userName
          FROM Booking b
          JOIN User u ON b.userId = u.id
          WHERE b.timeSlotId = ${s.id}
            AND b.status != 'CANCELLED'
          ORDER BY b.createdAt ASC
          LIMIT 1
        `;
        
        if (firstBooking.length > 0) {
          const user = firstBooking[0];
          console.log(`   Usuario: ${user.userName} (nivel ${user.userLevel})`);
          
          // Calcular rango correcto
          if (s.levelRanges) {
            const ranges = JSON.parse(s.levelRanges);
            const userLevel = parseFloat(user.userLevel);
            
            for (const range of ranges) {
              if (userLevel >= range.minLevel && userLevel <= range.maxLevel) {
                console.log(`   ✅ Debería mostrar: "${range.minLevel}-${range.maxLevel}"`);
                console.log(`   ❌ Actualmente muestra: "${s.level}"`);
                break;
              }
            }
          }
        }
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCristianClassesDec6();
