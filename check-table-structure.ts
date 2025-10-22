import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTableStructure() {
  console.log('🔍 Checking TimeSlot table structure in SQLite');
  console.log('');
  
  const result = await prisma.$queryRawUnsafe(`
    PRAGMA table_info(TimeSlot);
  `) as any[];
  
  console.log('📋 Columns in TimeSlot table:');
  console.log('');
  
  result.forEach((col: any) => {
    console.log(`${col.cid}. ${col.name}`);
    console.log(`   Type: ${col.type}`);
    console.log(`   NotNull: ${col.notnull === 1 ? 'YES' : 'NO'}`);
    console.log(`   Default: ${col.dflt_value || 'NULL'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkTableStructure();
