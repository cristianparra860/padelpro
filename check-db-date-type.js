const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const result = await prisma.$queryRawUnsafe('SELECT start, typeof(start) as type FROM TimeSlot WHERE courtNumber IS NULL LIMIT 1');
  console.log('Start value:', result[0]);
  console.log('Raw DB value type:', result[0].type);
  
  // Probar query con timestamp
  const now = new Date();
  const future = new Date(now.getTime() + 30*24*60*60*1000);
  const startTS = now.getTime();
  const endTS = future.getTime();
  
  console.log('\nTimestamp range:', startTS, 'to', endTS);
  
  const byTimestamp = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM TimeSlot WHERE start >= ? AND start <= ?',
    startTS, endTS
  );
  console.log('By timestamp:', byTimestamp[0].count);
  
  await prisma.$disconnect();
})();
