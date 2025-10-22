import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDateStorage() {
  console.log('🔍 Checking how dates are stored in SQLite');
  console.log('');
  
  // Get raw data from database
  const samples = await prisma.$queryRawUnsafe(`
    SELECT id, start, typeof(start) as startType FROM TimeSlot 
    ORDER BY start ASC
    LIMIT 5
  `) as any[];
  
  console.log('📋 Sample records with typeof:');
  samples.forEach((slot: any) => {
    console.log(`\nID: ${slot.id}`);
    console.log(`Start value: ${slot.start}`);
    console.log(`Start type: ${slot.startType}`);
    console.log(`Start raw: ${JSON.stringify(slot.start)}`);
  });
  
  await prisma.$disconnect();
}

checkDateStorage();
