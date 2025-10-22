const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rawTest() {
  // Probar con SQL directo
  const result = await prisma.$queryRaw`
    SELECT id, start, end 
    FROM TimeSlot 
    WHERE start >= datetime('2025-09-30T22:00:00.000Z')
      AND start <= datetime('2025-10-31T22:59:59.999Z')
    ORDER BY start ASC
    LIMIT 5
  `;
  
  console.log('\n📊 SQL Query Result:');
  console.log(`Found ${result.length} classes\n`);
  
  if (result.length > 0) {
    result.forEach(r => {
      console.log(`  ${r.start} - ${r.id.substring(0, 20)}...`);
    });
  } else {
    // Ver formato real de las fechas
    const sample = await prisma.$queryRaw`
      SELECT start, typeof(start) as type
      FROM TimeSlot 
      LIMIT 3
    `;
    console.log('\nSample dates from DB:');
    sample.forEach(s => console.log(`  ${s.start} (type: ${s.type})`));
  }
  
  await prisma.$disconnect();
}

rawTest();
