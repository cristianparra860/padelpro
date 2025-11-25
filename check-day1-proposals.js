const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay1() {
  const date = '2025-11-19';
  
  // Contar propuestas para ese día
  const proposals = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM TimeSlot
    WHERE start >= ${date + 'T00:00:00.000Z'}
    AND start < ${date + 'T23:59:59.999Z'}
    AND courtId IS NULL
  `;
  
  console.log('Total proposals for', date, ':', proposals[0].count);
  
  // Ver algunos ejemplos con detalles
  const examples = await prisma.$queryRaw`
    SELECT id, start, level, category, maxPlayers, instructorId
    FROM TimeSlot
    WHERE start >= ${date + 'T00:00:00.000Z'}
    AND start < ${date + 'T23:59:59.999Z'}
    AND courtId IS NULL
    LIMIT 10
  `;
  
  console.log('\nExamples:');
  examples.forEach(slot => {
    console.log(`  ${new Date(slot.start).toLocaleTimeString('es-ES')} - Level: ${slot.level}, Category: ${slot.category}, Max: ${slot.maxPlayers}`);
  });
  
  // Contar por nivel
  const byLevel = await prisma.$queryRaw`
    SELECT level, COUNT(*) as count
    FROM TimeSlot
    WHERE start >= ${date + 'T00:00:00.000Z'}
    AND start < ${date + 'T23:59:59.999Z'}
    AND courtId IS NULL
    GROUP BY level
  `;
  
  console.log('\nBy level:');
  byLevel.forEach(row => {
    console.log(`  ${row.level}: ${row.count}`);
  });
  
  await prisma.$disconnect();
}

checkDay1();
