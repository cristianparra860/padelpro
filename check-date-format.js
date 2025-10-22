const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const result = await prisma.$queryRaw`
    SELECT start, typeof(start) as type 
    FROM TimeSlot 
    LIMIT 1
  `;
  
  console.log('\n📅 Formato de fecha en SQLite:');
  console.log(result);

  await prisma.$disconnect();
}

check();
