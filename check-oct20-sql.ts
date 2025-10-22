import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOct20SQL() {
  console.log('🔍 Checking what is in the database for Oct 20, 2025');
  console.log('');
  
  // Test 1: Count all slots
  const allCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM TimeSlot
  `) as any[];
  console.log('📊 Total TimeSlots:', allCount[0].count);
  
  // Test 2: Count with courtId=null
  const nullCourtIdCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM TimeSlot WHERE courtId IS NULL
  `) as any[];
  console.log('📊 TimeSlots with courtId=NULL:', nullCourtIdCount[0].count);
  
  // Test 3: Count for October 2025
  const octoberCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM TimeSlot 
    WHERE start >= '2025-10-01' AND start < '2025-11-01'
    AND courtId IS NULL
  `) as any[];
  console.log('📊 October proposals (courtId=NULL):', octoberCount[0].count);
  
  // Test 4: Count for Oct 20, 2025
  const oct20Count = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM TimeSlot 
    WHERE start >= '2025-10-20T00:00:00.000Z' 
    AND start <= '2025-10-20T23:59:59.999Z'
    AND courtId IS NULL
  `) as any[];
  console.log('📊 Oct 20 proposals (UTC range):', oct20Count[0].count);
  
  // Test 5: Using the exact same range as API
  const date = '2025-10-20';
  const startOfDay = new Date(date + 'T00:00:00');
  const endOfDay = new Date(date + 'T23:59:59');
  
  console.log('');
  console.log('📅 API Date Range:');
  console.log('   Start:', startOfDay.toISOString());
  console.log('   End:  ', endOfDay.toISOString());
  
  const apiRangeCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM TimeSlot 
    WHERE start >= ? AND start <= ?
    AND courtId IS NULL
  `, startOfDay.toISOString(), endOfDay.toISOString()) as any[];
  
  console.log('📊 Oct 20 with API range:', apiRangeCount[0].count);
  
  // Test 6: Show some sample dates
  console.log('');
  console.log('📋 Sample dates in database:');
  const samples = await prisma.$queryRawUnsafe(`
    SELECT id, start, courtId FROM TimeSlot 
    WHERE courtId IS NULL
    ORDER BY start ASC
    LIMIT 10
  `) as any[];
  
  samples.forEach((slot: any) => {
    console.log(`   ${slot.id}: ${slot.start} (courtId: ${slot.courtId})`);
  });
  
  await prisma.$disconnect();
}

checkOct20SQL();
