const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRaw() {
  // Ver el string RAW en la base de datos
  const result = await prisma.$queryRawUnsafe(`
    SELECT start FROM TimeSlot 
    WHERE date(start) = '2025-11-29'
    ORDER BY start
    LIMIT 10
  `);
  
  console.log('Primeras 10 clases (raw de DB):');
  result.forEach((r, i) => {
    // Mostrar tal cual está en la DB
    const raw = JSON.stringify(r.start);
    console.log(`${i+1}. ${raw}`);
  });
  
  await prisma.$disconnect();
}

checkRaw();
