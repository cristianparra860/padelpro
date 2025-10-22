import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAvailableDates() {
  console.log('🔍 Checking what dates are available');
  console.log('');
  
  // Get unique dates
  const dates = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT date(start) as dateOnly, COUNT(*) as count
    FROM TimeSlot
    WHERE courtId IS NULL
    GROUP BY date(start)
    ORDER BY date(start) ASC
    LIMIT 20
  `) as any[];
  
  console.log('📅 Available dates with proposals:');
  dates.forEach((row: any) => {
    console.log(`   ${row.dateOnly}: ${row.count} proposals`);
  });
  
  await prisma.$disconnect();
}

checkAvailableDates();
