const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCourtNumberColumn() {
  try {
    console.log('🔧 Agregando columna courtNumber a TimeSlot...\n');

    await prisma.$executeRaw`
      ALTER TABLE TimeSlot ADD COLUMN courtNumber INTEGER DEFAULT NULL
    `;

    console.log('✅ Columna courtNumber agregada exitosamente!');

  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('ℹ️  La columna courtNumber ya existe');
    } else {
      console.error('❌ Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addCourtNumberColumn();
