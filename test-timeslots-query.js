const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTimeslotsApi() {
  try {
    console.log('🔍 Simulando el query del API timeslots...\n');

    const clubId = 'club-padel-estrella';
    const date = '2025-10-17';

    let query = `SELECT * FROM TimeSlot WHERE 1=1`;
    const params = [];
    
    if (clubId) {
      query += ` AND clubId = ?`;
      params.push(clubId);
    }
    
    if (date) {
      query += ` AND start LIKE ?`;
      params.push(`${date}%`);
    }
    
    query += ` AND courtNumber IS NULL`;
    query += ` ORDER BY start ASC`;

    console.log('📝 SQL Query:', query);
    console.log('📝 Params:', params);

    const timeSlots = await prisma.$queryRawUnsafe(query, ...params);

    console.log(`\n✅ Encontrados ${timeSlots.length} time slots`);
    
    if (timeSlots.length > 0) {
      console.log('\n📋 Primeros 3 time slots:');
      timeSlots.slice(0, 3).forEach((slot, i) => {
        console.log(`\n${i + 1}. ID: ${slot.id}`);
        console.log(`   Club: ${slot.clubId}`);
        console.log(`   Instructor: ${slot.instructorId}`);
        console.log(`   Start: ${slot.start}`);
        console.log(`   Court: ${slot.courtNumber || 'Sin asignar'}`);
        console.log(`   Level: ${slot.level}`);
        console.log(`   Category: ${slot.category}`);
      });
    } else {
      console.log('\n⚠️  No se encontraron clases para los criterios especificados');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTimeslotsApi();
