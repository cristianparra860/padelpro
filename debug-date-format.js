const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const confirmed = await prisma.$queryRaw`
      SELECT id, start, courtId, courtNumber
      FROM TimeSlot
      WHERE courtId IS NOT NULL
      LIMIT 5
    `;

    console.log('\n📊 Formato de almacenamiento en DB:\n');
    confirmed.forEach(c => {
      console.log(`  start (raw): ${c.start}`);
      console.log(`  start (tipo): ${typeof c.start}`);
      console.log(`  start (Date): ${new Date(c.start).toISOString()}`);
      console.log('');
    });

    // Test de la query con ISO strings
    const startISO = new Date('2025-11-01T00:00:00.000Z').toISOString();
    const endISO = new Date('2025-11-30T23:59:59.999Z').toISOString();
    
    console.log(`\nTest: Buscando entre ${startISO} y ${endISO}`);
    
    const test = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE courtId IS NOT NULL
        AND start >= ${startISO}
        AND start <= ${endISO}
    `;
    
    console.log(`Resultado: ${test[0].count} clases encontradas\n`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
