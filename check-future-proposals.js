// Verificar propuestas futuras con courtId NULL
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFutureProposals() {
  try {
    const now = new Date();
    const nowTimestamp = now.getTime();
    
    // Propuestas futuras de Cristian Parra sin courtId
    const proposals = await prisma.$queryRawUnsafe(`
      SELECT * FROM TimeSlot
      WHERE instructorId = ?
        AND courtId IS NULL
        AND start > ?
      ORDER BY start ASC
      LIMIT 15
    `, 'instructor-cristian-parra', nowTimestamp);
    
    console.log(`\n✅ Propuestas FUTURAS sin courtId: ${proposals.length}\n`);
    console.log(`📅 Fecha actual: ${now.toLocaleString('es-ES')}\n`);
    
    if (proposals.length > 0) {
      proposals.forEach((slot, i) => {
        const date = new Date(slot.start);
        const isFuture = date > now;
        console.log(`${i + 1}. ${date.toLocaleString('es-ES')} - ${isFuture ? '✅ Futura' : '❌ Pasada'} - ID: ${slot.id}`);
      });
    } else {
      console.log('❌ No hay propuestas futuras sin courtId');
      console.log('\n💡 Posibles causas:');
      console.log('   1. Todas las propuestas ya tienen courtId asignado');
      console.log('   2. No se han generado propuestas para fechas futuras');
      console.log('   3. Las propuestas se generaron pero fueron borradas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFutureProposals();
