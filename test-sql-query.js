const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
  try {
    const query = `SELECT t.*, c.number as courtNumber FROM TimeSlot t LEFT JOIN Court c ON t.courtId = c.id WHERE t.clubId = ? LIMIT 3`;
    const result = await prisma.$queryRawUnsafe(query, 'padel-estrella-madrid');
    
    console.log('✅ Query ejecutado correctamente');
    console.log(`   Resultados: ${result.length}`);
    
    if (result.length > 0) {
      console.log('\n   Primer resultado:');
      console.log('   ID:', result[0].id);
      console.log('   courtId:', result[0].courtId);
      console.log('   courtNumber:', result[0].courtNumber);
      console.log('   Campos:', Object.keys(result[0]).join(', '));
    }
  } catch (err) {
    console.log('❌ Error en query:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
