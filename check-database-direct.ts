import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('\n🔍 Verificando base de datos...\n');
    
    // Contar TODAS las clases
    const allClasses = await prisma.timeSlot.count();
    console.log(`📊 Total de TimeSlots en DB: ${allClasses}`);
    
    // Contar propuestas (courtId = null)
    const proposals = await prisma.timeSlot.count({
      where: { courtId: null }
    });
    console.log(`🟠 Propuestas (courtId = null): ${proposals}`);
    
    // Contar confirmadas (courtId != null)
    const confirmed = await prisma.timeSlot.count({
      where: { courtId: { not: null } }
    });
    console.log(`🟢 Confirmadas (courtId != null): ${confirmed}`);
    
    // Propuestas por mes
    const octoberProposals = await prisma.timeSlot.count({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31T23:59:59')
        }
      }
    });
    console.log(`\n📅 Propuestas en Octubre: ${octoberProposals}`);
    
    // Ver algunas propuestas de Oct 23
    const sampleProposals = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-23T00:00:00'),
          lte: new Date('2025-10-23T23:59:59')
        }
      },
      take: 10,
      orderBy: { start: 'asc' },
      select: {
        start: true,
        courtId: true,
        instructorId: true
      }
    });
    
    console.log(`\n📋 Primeras 10 propuestas del 23 Oct:`);
    sampleProposals.forEach((p, i) => {
      const hour = p.start.getHours();
      const min = p.start.getMinutes();
      console.log(`   ${i + 1}. ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} - ${p.instructorId?.slice(-10)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
