const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTestClass() {
  try {
    // Buscar clase de Cristian Parra sin inscripciones
    const openClasses = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.level,
        ts.levelRange,
        ts.start,
        i.name as instructorName,
        (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id) as bookingCount
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.courtId IS NULL
        AND ts.instructorId = 'instructor-cristian-parra'
        AND ts.start > ${Date.now()}
      ORDER BY ts.start
      LIMIT 5
    `;
    
    console.log('🔍 Clases futuras de Cristian Parra sin pista asignada:\n');
    
    openClasses.forEach((c, i) => {
      const date = new Date(Number(c.start));
      console.log(`${i + 1}. ${date.toLocaleString('es-ES')}`);
      console.log(`   Level: ${c.level}`);
      console.log(`   LevelRange: ${c.levelRange || 'NULL'}`);
      console.log(`   Inscripciones: ${c.bookingCount}`);
      console.log('');
    });
    
    if (openClasses.length === 0) {
      console.log('⚠️ No hay clases futuras de Cristian Parra disponibles');
    } else {
      const withoutBookings = openClasses.filter(c => Number(c.bookingCount) === 0);
      if (withoutBookings.length > 0) {
        console.log(`✅ Hay ${withoutBookings.length} clase(s) sin inscripciones donde probar`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findTestClass();
