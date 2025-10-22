const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addGroupSize() {
  try {
    console.log('🔧 Agregando columna groupSize a Booking...\n');

    await prisma.$executeRaw`
      ALTER TABLE Booking ADD COLUMN groupSize INTEGER DEFAULT 1
    `;

    console.log('✅ Columna groupSize agregada exitosamente!');

  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('ℹ️  La columna groupSize ya existe');
    } else {
      console.error('❌ Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addGroupSize();
