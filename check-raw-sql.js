const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRawSQL() {
  console.log('🔍 Verificando valores RAW en SQLite...\n');
  
  // Query directo a SQLite
  const raw = await prisma.$queryRawUnsafe(`
    SELECT id, start, end, typeof(start) as startType, instructorId, courtNumber
    FROM TimeSlot 
    LIMIT 10
  `);
  
  console.log('📊 Raw data from SQLite:\n');
  raw.forEach((row, i) => {
    console.log(`${i + 1}. ID: ${row.id}`);
    console.log(`   start: ${row.start}`);
    console.log(`   typeof(start): ${row.startType}`);
    console.log(`   instructorId: ${row.instructorId}`);
    console.log('');
  });
  
  // Ahora probar el query del API
  const startISO = '2025-11-01T00:00:00.000Z';
  const endISO = '2025-12-01T23:59:59.999Z';
  const startTimestamp = new Date(startISO).getTime();
  const endTimestamp = new Date(endISO).getTime();
  
  console.log('🔍 Testing query con rango:\n');
  console.log(`startISO: ${startISO} (${startTimestamp})`);
  console.log(`endISO: ${endISO} (${endTimestamp})\n`);
  
  const results = await prisma.$queryRawUnsafe(`
    SELECT id, start, typeof(start) as startType
    FROM TimeSlot
    WHERE (start >= ? AND start <= ?)
       OR (CAST(start AS INTEGER) >= ? AND CAST(start AS INTEGER) <= ?)
    LIMIT 5
  `, startISO, endISO, startTimestamp, endTimestamp);
  
  console.log(`📊 Resultados encontrados: ${results.length}`);
  
  if (results.length > 0) {
    results.forEach((row, i) => {
      console.log(`${i + 1}. ${row.id} - start: ${row.start} (${row.startType})`);
    });
  } else {
    console.log('❌ No se encontraron resultados con este query');
    
    // Probar query simple
    const simple = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total FROM TimeSlot
    `);
    console.log(`\n📊 Total registros en TimeSlot: ${simple[0].total}`);
  }
  
  await prisma.$disconnect();
}

checkRawSQL().catch(console.error);
