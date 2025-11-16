const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProposals() {
  const result = await prisma.$queryRaw`SELECT COUNT(*) as total FROM TimeSlot WHERE courtId IS NULL`;
  console.log('Propuestas en BD:', result);
  
  const sample = await prisma.$queryRaw`SELECT id, start, courtId FROM TimeSlot WHERE courtId IS NULL LIMIT 3`;
  console.log('Ejemplos:', sample);
  
  await prisma.$disconnect();
}

checkProposals();
