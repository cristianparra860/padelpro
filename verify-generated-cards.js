const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    // Tarjetas sin asignar por nivel y categoría
    const distribution = await prisma.$queryRaw`
      SELECT level, genderCategory, COUNT(*) as count 
      FROM TimeSlot 
      WHERE courtId IS NULL 
      GROUP BY level, genderCategory
    `;

    console.log('📊 Tarjetas sin asignar por nivel/categoría:\n');
    distribution.forEach(row => {
      console.log(`  ${row.level || 'NULL'} / ${row.genderCategory || 'NULL'}: ${row.count} tarjetas`);
    });

    // Tarjetas por instructor
    const byInstructor = await prisma.$queryRaw`
      SELECT i.name, COUNT(*) as count
      FROM TimeSlot ts
      JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.courtId IS NULL
      GROUP BY ts.instructorId
    `;

    console.log('\n👥 Tarjetas por instructor:\n');
    byInstructor.forEach(row => {
      console.log(`  ${row.name}: ${row.count} tarjetas`);
    });

    // Ejemplo de tarjetas del día de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const todayCards = await prisma.$queryRaw`
      SELECT i.name as instructor, ts.start, ts.level, ts.genderCategory
      FROM TimeSlot ts
      JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.courtId IS NULL
      AND ts.start >= ${todayStart}
      AND ts.start < ${todayEnd}
      ORDER BY ts.start
      LIMIT 10
    `;

    console.log('\n📅 Ejemplos de tarjetas hoy (primeras 10):\n');
    todayCards.forEach(card => {
      const time = new Date(Number(card.start));
      console.log(`  ${time.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${card.instructor} (${card.level}/${card.genderCategory || 'NULL'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
