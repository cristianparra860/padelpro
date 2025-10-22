// Script para verificar campos de User
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserFields() {
  try {
    console.log('🔍 Verificando estructura de la tabla User...\n');

    const result = await prisma.$queryRawUnsafe(`
      PRAGMA table_info(User)
    `);

    console.log('📊 Campos de la tabla User:');
    console.table(result);

    // También verificar un usuario de ejemplo
    const users = await prisma.$queryRaw`
      SELECT id, name, level, position FROM User LIMIT 3
    `;

    console.log('\n👤 Ejemplos de usuarios:');
    console.table(users);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserFields();
