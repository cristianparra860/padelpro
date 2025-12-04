const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmptySlots() {
  try {
    const emptySlots = await prisma.$queryRaw`
      SELECT 
        ts.id, 
        ts.start, 
        ts.level, 
        ts.genderCategory, 
        ts.levelRange,
        ts.instructorId,
        i.name as instructor,
        i.levelRanges,
        (SELECT COUNT(*) FROM Booking b WHERE b.timeSlotId = ts.id) as bookingCount
      FROM TimeSlot ts
      JOIN Instructor i ON i.id = ts.instructorId
      WHERE ts.courtId IS NULL 
        AND ts.start > ${Date.now()}
      ORDER BY ts.start
      LIMIT 5
    `;

    console.log('\n📋 Primeras 5 clases vacías disponibles para prueba:\n');
    
    emptySlots.forEach(slot => {
      const date = new Date(Number(slot.start));
      console.log(`🎾 ID: ${slot.id}`);
      console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${slot.instructor} (ID: ${slot.instructorId})`);
      console.log(`   Level actual: '${slot.level || 'VACÍO'}'`);
      console.log(`   Gender: '${slot.genderCategory || 'NULL'}'`);
      console.log(`   LevelRange: '${slot.levelRange || 'NULL'}'`);
      console.log(`   Reservas actuales: ${slot.bookingCount}`);
      
      // Mostrar rangos del instructor
      if (slot.levelRanges) {
        try {
          const ranges = JSON.parse(slot.levelRanges);
          const rangeDisplay = ranges.map(r => `${r.minLevel}-${r.maxLevel}`).join(', ');
          console.log(`   Rangos del instructor: ${rangeDisplay}`);
        } catch (e) {
          console.log(`   Rangos del instructor: ERROR al parsear`);
        }
      } else {
        console.log(`   ⚠️ Instructor sin rangos configurados`);
      }
      console.log('');
    });

    // Mostrar usuarios disponibles para prueba
    console.log('\n👥 Usuarios disponibles para hacer reserva:\n');
    const users = await prisma.$queryRaw`
      SELECT id, name, email, gender, level
      FROM User
      WHERE gender IS NOT NULL
      LIMIT 5
    `;

    users.forEach(user => {
      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   Nivel: ${user.level}`);
      console.log(`   Género: ${user.gender}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmptySlots();
