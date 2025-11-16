const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProposalsDuration() {
  try {
    console.log('🔍 Buscando propuestas con duración incorrecta...');
    
    // Buscar todas las propuestas (courtId = null)
    const proposals = await prisma.timeSlot.findMany({
      where: {
        courtId: null
      }
    });
    
    console.log(`📊 Total propuestas encontradas: ${proposals.length}`);
    
    // Contar cuántas tienen duración incorrecta (≠ 60 minutos)
    const incorrect = proposals.filter(p => {
      const start = new Date(p.start);
      const end = new Date(p.end);
      const durationMin = (end - start) / (1000 * 60);
      return durationMin !== 60;
    });
    
    console.log(`⚠️ Propuestas con duración incorrecta: ${incorrect.length}`);
    
    if (incorrect.length > 0) {
      console.log(`🗑️ Eliminando ${incorrect.length} propuestas incorrectas...`);
      
      await prisma.timeSlot.deleteMany({
        where: {
          courtId: null
        }
      });
      
      console.log('✅ Propuestas eliminadas correctamente');
      console.log('🔄 Ahora ejecuta el generador automático para crear propuestas correctas de 60 minutos');
      console.log('   Comando: node -e "fetch(\'http://localhost:9002/api/cron/generate-cards\').then(r => r.text()).then(console.log)"');
    } else {
      console.log('✅ Todas las propuestas tienen la duración correcta (60 minutos)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProposalsDuration();
