const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConstraints() {
  try {
    console.log('🔍 Verificando restricciones de la tabla Booking...\n');

    // Obtener el schema de la tabla Booking
    const tableInfo = await prisma.$queryRaw`
      PRAGMA table_info(Booking)
    `;

    console.log('📋 Columnas de la tabla Booking:');
    console.table(tableInfo);

    // Obtener los índices y restricciones
    const indexes = await prisma.$queryRaw`
      PRAGMA index_list(Booking)
    `;

    console.log('\n📊 Índices y restricciones:');
    console.table(indexes);

    // Para cada índice, obtener las columnas
    for (const index of indexes) {
      const indexInfo = await prisma.$queryRaw`
        PRAGMA index_info(${index.name})
      `;
      console.log(`\n🔑 Detalles del índice "${index.name}":`);
      console.table(indexInfo);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConstraints();
