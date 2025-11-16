const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTable() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='Transaction'
    `;
    console.log('✅ Tabla Transaction encontrada:', tables);
    
    // Ver estructura de la tabla
    const structure = await prisma.$queryRaw`
      PRAGMA table_info(\`Transaction\`)
    `;
    console.log('\n📋 Estructura de la tabla:');
    structure.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
