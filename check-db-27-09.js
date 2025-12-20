const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDirectDB() {
  try {
    console.log('\n🔍 Verificando TimeSlots del 27 dic a las 09:00...\n');
    
    // Timestamp del 27 de diciembre 2025 a las 09:00 UTC
    const startTimestamp = new Date('2025-12-27T09:00:00Z').getTime();
    const endTimestamp = new Date('2025-12-27T10:00:00Z').getTime();
    
    console.log(`📅 Buscando entre timestamps: ${startTimestamp} - ${endTimestamp}`);
    console.log(`📅 Fecha: ${new Date(startTimestamp).toISOString()}\n`);
    
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.*,
        i.name as instructorName,
        (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status IN ('PENDING', 'CONFIRMED')) as activeBookings
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start >= ${startTimestamp}
      AND ts.start < ${endTimestamp}
      ORDER BY ts.start, i.name
    `;
    
    console.log(`📊 TimeSlots encontrados: ${slots.length}\n`);
    
    for (const slot of slots) {
      console.log('═'.repeat(80));
      console.log(`🎾 TimeSlot ID: ${slot.id.substring(0, 20)}...`);
      console.log(`   👨‍🏫 Instructor: ${slot.instructorName || 'SIN NOMBRE'}`);
      console.log(`   📅 Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   🏷️  level: ${slot.level !== null ? slot.level : 'NULL'}`);
      console.log(`   🏷️  levelRange: ${slot.levelRange !== null ? slot.levelRange : 'NULL'}`);
      console.log(`   👥 genderCategory: ${slot.genderCategory !== null ? slot.genderCategory : 'NULL'}`);
      console.log(`   🏟️  courtNumber: ${slot.courtNumber !== null ? slot.courtNumber : 'NULL'}`);
      console.log(`   👥 Bookings activos: ${slot.activeBookings}`);
      
      // Mostrar todos los bookings
      const bookings = await prisma.$queryRaw`
        SELECT b.*, u.name as userName, u.email
        FROM Booking b
        LEFT JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slot.id}
        ORDER BY b.createdAt DESC
      `;
      
      if (bookings.length > 0) {
        console.log(`\n   📋 Todos los bookings (${bookings.length}):`);
        bookings.forEach((b, i) => {
          console.log(`      ${i+1}. [${b.status}] ${b.userName || 'Sin nombre'} - GroupSize: ${b.groupSize}`);
          console.log(`         Created: ${new Date(b.createdAt).toLocaleString('es-ES')}`);
        });
      } else {
        console.log(`\n   ℹ️ Sin bookings (debería resetearse nivel y categoría)`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDirectDB();
