const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorTable() {
  try {
    const info = await prisma.$queryRaw`PRAGMA table_info(Instructor)`;
    console.log('📋 Estructura de la tabla Instructor:');
    info.forEach(col => {
      console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorTable();
