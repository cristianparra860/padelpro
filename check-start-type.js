const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe('SELECT id, start, typeof(start) as type FROM TimeSlot WHERE clubId = "padel-estrella-madrid" LIMIT 5');
  
  console.log('\n📊 Tipo de dato de la columna start:');
  console.table(result);
  
  // Intentar la misma query que usa el API
  const testISO = '2025-11-25T07:00:00.000Z';
  console.log(`\n🔍 Probando query del API con start = '${testISO}':`);
  
  const withEquals = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot
    WHERE clubId = 'padel-estrella-madrid'
    AND start = '${testISO}'
    AND courtId IS NULL
  `);
  
  console.log(`✅ Resultados con start = '${testISO}': ${withEquals.length}`);
  
  // Probar con timestamp
  const testTimestamp = new Date(testISO).getTime();
  console.log(`\n🔍 Probando query con timestamp ${testTimestamp}:`);
  
  const withTimestamp = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot
    WHERE clubId = 'padel-estrella-madrid'
    AND start = ${testTimestamp}
    AND courtId IS NULL
  `);
  
  console.log(`✅ Resultados con start = ${testTimestamp}: ${withTimestamp.length}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
