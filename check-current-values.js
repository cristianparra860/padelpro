// Ver valores exactos de level y category en clases con pista
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkValues() {
  try {
    const slots = await prisma.$queryRaw`
      SELECT id, level, category, courtNumber 
      FROM TimeSlot 
      WHERE courtNumber IS NOT NULL AND courtNumber > 0
      LIMIT 5
    `;

    console.log('📊 Valores actuales en clases con pista:');
    console.table(slots);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkValues();
