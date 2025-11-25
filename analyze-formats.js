const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  // Contar formatos
  const isoCount = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM TimeSlot
    WHERE start LIKE '2025-11-29T%'
  `;
  
  const toStringCount = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM TimeSlot
    WHERE start LIKE 'Sat Nov 29 2025%'
  `;
  
  console.log(`Formato ISO (2025-11-29T...): ${isoCount[0].count} clases`);
  console.log(`Formato toString (Sat Nov 29...): ${toStringCount[0].count} clases`);
  
  // Mostrar una de cada
  const iso = await prisma.$queryRaw`
    SELECT start FROM TimeSlot 
    WHERE start LIKE '2025-11-29T%'
    LIMIT 1
  `;
  
  if (iso.length > 0) {
    console.log(`\nEjemplo ISO: ${iso[0].start}`);
  }
  
  await prisma.$disconnect();
}

analyze();
