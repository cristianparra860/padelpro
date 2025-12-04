// Verificar clases con creditsSlots activados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCreditsSlots() {
  try {
    const slots = await prisma.timeSlot.findMany({
      where: {
        creditsSlots: { not: null }
      },
      take: 10
    });
    
    console.log('\n✅ Clases con creditsSlots activados:', slots.length);
    
    if (slots.length > 0) {
      console.log('\nDetalle:\n');
      slots.forEach(s => {
        const date = new Date(s.start);
        console.log(`📅 ${date.toLocaleString('es-ES')}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   creditsSlots: ${s.creditsSlots}`);
        console.log(`   creditsCost: ${s.creditsCost}`);
        console.log('');
      });
    } else {
      console.log('❌ No hay clases con creditsSlots activados');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCreditsSlots();
