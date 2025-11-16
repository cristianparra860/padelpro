const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const result = await prisma.$queryRawUnsafe('SELECT typeof(start) as type, start FROM TimeSlot LIMIT 1');
  console.log('Resultado:', result);
  process.exit();
}

check();
