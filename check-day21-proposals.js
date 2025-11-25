const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProposalsDay21() {
  try {
    console.log('🔍 Investigando propuestas del día 21 de noviembre...\n');
    
    const day21 = new Date('2025-11-21T00:00:00.000Z');
    const day22 = new Date('2025-11-22T00:00:00.000Z');
    
    // Buscar propuestas (courtId = null) del día 21
    const proposals = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: day21,
          lt: day22
        }
      },
      include: {
        instructor: {
          include: { user: true }
        },
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: { user: true }
        }
      },
      take: 10
    });
    
    console.log(`📊 Total propuestas día 21: ${proposals.length}\n`);
    
    if (proposals.length === 0) {
      console.log('❌ No hay propuestas para el día 21');
      await prisma.$disconnect();
      return;
    }
    
    // Analizar cada propuesta
    proposals.forEach((p, i) => {
      console.log(`\n${i + 1}. Propuesta ${p.id.substring(0, 10)}...`);
      console.log(`   Instructor: ${p.instructor?.user?.name || 'N/A'}`);
      console.log(`   Hora: ${new Date(p.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`   Nivel: ${p.level}`);
      console.log(`   Categoría: ${p.genderCategory || 'N/A'}`);
      console.log(`   Bookings: ${p.bookings.length}`);
      
      if (p.bookings.length > 0) {
        p.bookings.forEach(b => {
          console.log(`      - Usuario: ${b.user?.name} (${b.user?.level || 'sin nivel'})`);
        });
      }
    });
    
    // Comparar con propuestas antes del día 21
    console.log('\n\n🔄 Comparando con propuestas ANTES del día 21...\n');
    
    const day13 = new Date('2025-11-13T00:00:00.000Z');
    const day14 = new Date('2025-11-14T00:00:00.000Z');
    
    const proposalsBefore = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: day13,
          lt: day14
        }
      },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }
      },
      take: 5
    });
    
    console.log(`📊 Propuestas día 13 (ejemplo): ${proposalsBefore.length}`);
    proposalsBefore.forEach((p, i) => {
      console.log(`   ${i + 1}. Nivel: ${p.level}, Bookings: ${p.bookings.length}`);
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkProposalsDay21();
