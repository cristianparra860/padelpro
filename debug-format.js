const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  // Ver cómo están guardadas en la DB
  const raw = await prisma.$queryRaw`
    SELECT start, typeof(start) as tipo
    FROM TimeSlot
    WHERE start LIKE '2025-11-29%07%'
    LIMIT 5
  `;
  
  console.log('Clases de 07:00 en DB (raw):');
  raw.forEach(r => console.log(`  ${r.start} (tipo: ${r.tipo})`));
  
  // Comparar con las de 08:00
  const raw8 = await prisma.$queryRaw`
    SELECT start, typeof(start) as tipo
    FROM TimeSlot
    WHERE start LIKE '2025-11-29%08%'
    LIMIT 2
  `;
  
  console.log('\nClases de 08:00 en DB (para comparar):');
  raw8.forEach(r => console.log(`  ${r.start} (tipo: ${r.tipo})`));
  
  await prisma.$disconnect();
}

debug();
