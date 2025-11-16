const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.$executeRaw`DELETE FROM TimeSlot WHERE start < 1000000000000 OR end < 1000000000000`;
  console.log('Deleted:', r);
  await p.$disconnect();
})();