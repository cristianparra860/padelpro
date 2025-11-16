const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const confirmed = await prisma.$queryRaw`
      SELECT id, start, end, courtId, courtNumber
      FROM TimeSlot
      WHERE courtId IS NOT NULL
    `;

    console.log(`\n📊 Total clases confirmadas en toda la DB: ${confirmed.length}\n`);

    if (confirmed.length > 0) {
      console.log('Clases confirmadas con fechas:\n');
      confirmed.forEach(c => {
        const start = new Date(c.start);
        const end = new Date(c.end);
        console.log(`  ${start.toLocaleString('es-ES')} (UTC: ${c.start})`);
        console.log(`  Pista: ${c.courtNumber}`);
        console.log(`  ID: ${c.id.substring(0, 30)}`);
        console.log('');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
