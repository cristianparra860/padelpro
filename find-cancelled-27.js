const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUserCancelledBookings() {
  try {
    console.log('\n🔍 Buscando bookings CANCELLED del día 27...\n');
    
    // Buscar todos los bookings cancelados del 27 de diciembre
    const startTimestamp = new Date('2025-12-27T00:00:00Z').getTime();
    const endTimestamp = new Date('2025-12-28T00:00:00Z').getTime();
    
    const cancelledBookings = await prisma.$queryRaw`
      SELECT 
        b.id as bookingId,
        b.userId,
        b.groupSize,
        b.status,
        b.createdAt,
        b.updatedAt,
        u.name as userName,
        u.email,
        ts.id as timeSlotId,
        ts.start,
        ts.level,
        ts.levelRange,
        ts.genderCategory,
        ts.courtNumber,
        i.name as instructorName
      FROM Booking b
      JOIN User u ON b.userId = u.id
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE b.status = 'CANCELLED'
      AND ts.start >= ${startTimestamp}
      AND ts.start < ${endTimestamp}
      ORDER BY b.updatedAt DESC
      LIMIT 20
    `;
    
    console.log(`📊 Bookings cancelados encontrados: ${cancelledBookings.length}\n`);
    
    for (const b of cancelledBookings) {
      console.log('═'.repeat(80));
      const hora = new Date(b.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      console.log(`⏰ ${hora} - ${b.instructorName}`);
      console.log(`   Usuario: ${b.userName} (${b.email})`);
      console.log(`   GroupSize: ${b.groupSize}`);
      console.log(`   Cancelado: ${new Date(b.updatedAt).toLocaleString('es-ES')}`);
      console.log(`   TimeSlot: ${b.timeSlotId}`);
      console.log(`      level: "${b.level}"`);
      console.log(`      levelRange: "${b.levelRange}"`);
      console.log(`      genderCategory: "${b.genderCategory}"`);
      console.log(`      courtNumber: ${b.courtNumber}`);
      
      // Contar bookings activos restantes
      const activeBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM Booking
        WHERE timeSlotId = ${b.timeSlotId}
        AND status IN ('PENDING', 'CONFIRMED')
      `;
      
      const activeCount = activeBookings[0].count;
      console.log(`      ⚠️ Bookings activos restantes: ${activeCount} ${activeCount === 0 ? '← DEBERÍA RESETEARSE' : ''}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findUserCancelledBookings();
