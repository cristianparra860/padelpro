const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check one specific slot from the logs
  const slot = await prisma.timeSlot.findFirst({
    where: { id: 'ts-1764186364776-4d6byij56' }
  });
  
  console.log('\n=== TIMESLOT EN BASE DE DATOS ===');
  console.log('ID:', slot?.id);
  console.log('levelRange:', slot?.levelRange);
  console.log('level:', slot?.level);
  console.log('start:', slot?.start);
  console.log('\n=== FULL RECORD ===');
  console.log(JSON.stringify(slot, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
