// Verificar propuestas sin courtId en la base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProposals() {
  try {
    // Propuestas de Cristian Parra sin courtId
    const proposals = await prisma.timeSlot.findMany({
      where: {
        instructorId: 'instructor-cristian-parra',
        courtId: null
      },
      take: 10
    });
    
    console.log(`\n✅ Propuestas sin courtId (modificables): ${proposals.length}\n`);
    
    if (proposals.length > 0) {
      proposals.forEach((slot, i) => {
        console.log(`${i + 1}. ${new Date(slot.start).toLocaleString('es-ES')} - ID: ${slot.id}`);
      });
    } else {
      console.log('❌ No hay propuestas sin courtId para este instructor');
      console.log('   Todas las clases ya están confirmadas/ocupadas');
      console.log('\n💡 Solución: Generar nuevas propuestas de clase');
    }
    
    // Total de clases del instructor
    const total = await prisma.timeSlot.count({
      where: { instructorId: 'instructor-cristian-parra' }
    });
    
    console.log(`\n📊 Total clases del instructor: ${total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProposals();
