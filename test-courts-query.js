const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCourts() {
  try {
    const courts = await prisma.$queryRaw`SELECT * FROM Court`;
    console.log('📋 Pistas:', courts);
    console.log(`\nTotal: ${courts.length}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCourts();
