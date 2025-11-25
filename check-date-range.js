const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDateRange() {
  const dates = [
    '2025-11-29',
    '2025-11-30', 
    '2025-12-01',
    '2025-12-10',
    '2025-12-17'
  ];
  
  console.log('Checking proposals for date range...\n');
  
  for (const date of dates) {
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot
      WHERE date(start) = ${date}
      AND courtId IS NULL
    `;
    
    console.log(`${date}: ${count[0].count} proposals`);
  }
  
  await prisma.$disconnect();
}

checkDateRange();
