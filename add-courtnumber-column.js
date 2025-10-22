const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCourtNumber() {
  try {
    await prisma.$executeRaw`ALTER TABLE TimeSlot ADD COLUMN courtNumber INTEGER`;
    console.log('✅ Columna courtNumber agregada exitosamente');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️  La columna courtNumber ya existe');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addCourtNumber();
