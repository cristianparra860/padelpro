const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const slotsRaw = await prisma.$queryRaw`SELECT * FROM TimeSlot LIMIT 20`;
    
    console.log(`\n📊 Total clases (RAW): ${slotsRaw.length}\n`);
    
    if (slotsRaw.length > 0) {
      console.log('Primeras 20 clases:');
      slotsRaw.forEach(s => {
        console.log(`  ID: ${s.id.substring(0, 30)}`);
        console.log(`  Start: ${s.start} (tipo: ${typeof s.start})`);
        console.log(`  CourtID: ${s.courtId}`);
        console.log(`  CourtNumber: ${s.courtNumber}`);
        console.log('');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
