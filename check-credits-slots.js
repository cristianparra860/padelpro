const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCreditsSlots() {
  try {
    console.log('🔍 Verificando creditsSlots en la base de datos...\n');
    
    const slots = await prisma.timeSlot.findMany({
      where: {
        creditsSlots: { not: null }
      },
      select: {
        id: true,
        start: true,
        creditsSlots: true,
        instructorId: true,
        instructor: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    console.log(`✅ Total de slots con creditsSlots configurados: ${slots.length}\n`);
    
    if (slots.length === 0) {
      console.log('⚠️  No hay slots con creditsSlots configurados.');
      console.log('💡 Esto es normal si el instructor aún no ha activado ninguna plaza con puntos.\n');
    } else {
      slots.forEach(s => {
        const date = new Date(Number(s.start));
        console.log(`📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        console.log(`   Instructor: ${s.instructor?.name || 'N/A'}`);
        console.log(`   creditsSlots: ${s.creditsSlots}`);
        console.log(`   Slot ID: ${s.id}\n`);
      });
    }
    
    // Verificar slots recientes (próximos 7 días)
    const now = Date.now();
    const sevenDaysLater = now + (7 * 24 * 60 * 60 * 1000);
    
    const recentSlots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: String(now),
          lte: String(sevenDaysLater)
        },
        instructorId: { not: null }
      },
      select: {
        id: true,
        start: true,
        creditsSlots: true,
        instructor: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        start: 'asc'
      },
      take: 10
    });
    
    console.log(`\n📊 Próximas ${recentSlots.length} clases (siguientes 7 días):`);
    recentSlots.forEach(s => {
      const date = new Date(Number(s.start));
      const hasCredits = s.creditsSlots ? `✅ ${s.creditsSlots}` : '⭕ No configurado';
      console.log(`   ${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${s.instructor?.name || 'N/A'} - ${hasCredits}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCreditsSlots();
