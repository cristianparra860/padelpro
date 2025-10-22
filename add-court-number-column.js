// Script para agregar la columna courtNumber a TimeSlot
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCourtNumberColumn() {
  try {
    console.log('🔧 Agregando columna courtNumber a TimeSlot...\n');

    // Intentar agregar la columna
    await prisma.$executeRawUnsafe(`
      ALTER TABLE TimeSlot ADD COLUMN courtNumber INTEGER DEFAULT NULL
    `);

    console.log('✅ Columna courtNumber agregada exitosamente!\n');

    // Verificar que se agregó correctamente
    const result = await prisma.$queryRawUnsafe(`
      PRAGMA table_info(TimeSlot)
    `);

    console.log('📊 Estructura actual de TimeSlot:');
    console.table(result);

  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ La columna courtNumber ya existe en la tabla TimeSlot');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addCourtNumberColumn();
