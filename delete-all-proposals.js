const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllProposals() {
  try {
    console.log('\n🗑️  ELIMINANDO TODAS LAS PROPUESTAS DE CLASES\n');

    // Contar propuestas antes de eliminar
    const count = await prisma.timeSlot.count({
      where: { courtId: null }
    });

    console.log(`📊 Propuestas encontradas: ${count}`);

    if (count === 0) {
      console.log('✅ No hay propuestas para eliminar\n');
      return;
    }

    // Eliminar todas las propuestas (courtId = null)
    const result = await prisma.timeSlot.deleteMany({
      where: { courtId: null }
    });

    console.log(`✅ ${result.count} propuestas eliminadas exitosamente\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllProposals();
