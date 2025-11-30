const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlot() {
  try {
    // Buscar el TimeSlot de la clase de las 08:30 del 27 de noviembre
    const startTime = new Date('2025-11-27T08:30:00.000Z').getTime();
    
    const slots = await prisma.$queryRaw`
      SELECT 
        id, 
        start, 
        level, 
        levelRange, 
        genderCategory,
        instructorId
      FROM TimeSlot 
      WHERE start = ${startTime}
      AND instructorId = 'instructor-cristian-parra'
      LIMIT 5
    `;
    
    console.log('\n📋 TimeSlots de Cristian Parra a las 08:30:');
    console.log('═══════════════════════════════════════════');
    
    if (slots.length === 0) {
      console.log('⚠️ No se encontraron slots para esa hora');
    } else {
      slots.forEach((slot, i) => {
        console.log(`\nSlot ${i + 1}:`);
        console.log(`  ID: ${slot.id}`);
        console.log(`  Hora: ${new Date(Number(slot.start)).toISOString()}`);
        console.log(`  Level: ${slot.level}`);
        console.log(`  LevelRange: ${slot.levelRange || 'NULL'}`);
        console.log(`  GenderCategory: ${slot.genderCategory || 'NULL'}`);
        console.log(`  InstructorId: ${slot.instructorId}`);
      });
      
      // Buscar bookings de Marc Parra en ese slot
      const booking = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.timeSlotId,
          b.status,
          u.name,
          u.level
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slots[0].id}
        AND u.name LIKE '%Marc%'
      `;
      
      console.log('\n📝 Booking de Marc Parra:');
      console.log('═══════════════════════════════════════════');
      if (booking.length > 0) {
        console.log(`  ID: ${booking[0].id}`);
        console.log(`  Status: ${booking[0].status}`);
        console.log(`  User: ${booking[0].name}`);
        console.log(`  User Level: ${booking[0].level}`);
      } else {
        console.log('⚠️ No se encontró booking de Marc Parra');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlot();
