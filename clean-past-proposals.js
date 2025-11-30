const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🧹 Script: Limpiar propuestas pasadas
 * 
 * Elimina todos los TimeSlots con courtId=null (propuestas) 
 * que tienen fecha/hora anterior al momento actual.
 */

async function main() {
  console.log('🧹 Limpiando propuestas pasadas...\n');

  const now = new Date();
  console.log(`📅 Fecha/hora actual: ${now.toLocaleString('es-ES')}`);

  // Contar propuestas pasadas
  const pastProposals = await prisma.timeSlot.count({
    where: {
      courtId: null,
      start: { lt: now }
    }
  });

  console.log(`📊 Propuestas con fecha pasada: ${pastProposals}`);

  if (pastProposals === 0) {
    console.log('✅ No hay propuestas pasadas. ¡Todo limpio!');
    await prisma.$disconnect();
    return;
  }

  // Mostrar ejemplos
  const examples = await prisma.timeSlot.findMany({
    where: {
      courtId: null,
      start: { lt: now }
    },
    select: {
      id: true,
      start: true,
      level: true
    },
    take: 5,
    orderBy: { start: 'desc' }
  });

  console.log(`\n📋 Ejemplos de propuestas a eliminar:`);
  examples.forEach(p => {
    const date = new Date(p.start);
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    console.log(`   - ${date.toLocaleString('es-ES')} (hace ${diffHours}h) - ${p.level}`);
  });

  // Confirmar
  console.log(`\n⚠️  ¿Eliminar ${pastProposals} propuestas pasadas?`);
  console.log('   Ejecutando en 3 segundos... (Ctrl+C para cancelar)');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Eliminar
  const deleted = await prisma.timeSlot.deleteMany({
    where: {
      courtId: null,
      start: { lt: now }
    }
  });

  console.log(`\n✅ Eliminadas ${deleted.count} propuestas pasadas`);

  // Mostrar resumen final
  const remaining = await prisma.timeSlot.count({
    where: { courtId: null }
  });

  const confirmed = await prisma.timeSlot.count({
    where: { courtId: { not: null } }
  });

  console.log(`\n📊 Resumen final:`);
  console.log(`   🟠 Propuestas activas: ${remaining}`);
  console.log(`   🟢 Clases confirmadas: ${confirmed}`);
  console.log(`   📈 Total TimeSlots: ${remaining + confirmed}`);

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('❌ Error:', error);
  prisma.$disconnect();
  process.exit(1);
});
