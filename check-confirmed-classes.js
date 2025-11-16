const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const slots = await prisma.$queryRaw`
      SELECT id, start, courtId, courtNumber, instructorId
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      LIMIT 20
    `;

    console.log(`\n📊 Clases con courtNumber asignado: ${slots.length}\n`);

    if (slots.length > 0) {
      console.log('Primeras 20 clases:\n');
      slots.forEach(s => {
        const start = new Date(s.start);
        console.log(`  Hora: ${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`);
        console.log(`  courtId: ${s.courtId || 'NULL'}`);
        console.log(`  courtNumber: ${s.courtNumber}`);
        console.log(`  Instructor: ${s.instructorId?.substring(0, 25)}`);
        console.log('');
      });
    } else {
      console.log('❌ No hay clases con courtNumber asignado');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
