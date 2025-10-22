import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateFullOctober() {
  try {
    console.log('🗑️  Eliminando propuestas antiguas de octubre...');
    
    // Eliminar propuestas existentes de octubre
    const deleted = await prisma.timeSlot.deleteMany({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-01T00:00:00'),
          lte: new Date('2025-10-31T23:59:59')
        }
      }
    });
    
    console.log(`   Eliminadas: ${deleted.count} propuestas`);
    
    // Obtener instructores
    const instructors = await prisma.instructor.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log(`\n👨‍🏫 Instructores encontrados: ${instructors.length}`);
    instructors.forEach((inst, i) => 
      console.log(`   ${i + 1}. ${inst.id}`)
    );
    
    const proposals = [];
    
    // Generar propuestas para TODOS los días de octubre (1-31)
    for (let day = 1; day <= 31; day++) {
      // Para cada hora de 08:00 a 21:30 (cada 30 minutos)
      for (let hour = 8; hour < 22; hour++) {
        for (let minute of [0, 30]) {
          // Saltar después de 21:00
          if (hour === 21 && minute === 30) break;
          
          const startDate = new Date(2025, 9, day, hour, minute, 0); // mes 9 = octubre
          const endDate = new Date(startDate.getTime() + 90 * 60 * 1000); // +90 min
          
          // Crear propuesta para CADA instructor
          for (const instructor of instructors) {
            proposals.push({
              clubId: 'club-1',
              instructorId: instructor.id,
              courtId: null, // NULL = propuesta
              start: startDate,
              end: endDate,
              maxPlayers: 4,
              totalPrice: 25.0,
              level: 'INTERMEDIATE',
              category: 'ADULTS'
            });
          }
        }
      }
    }
    
    console.log(`\n📊 Propuestas a crear: ${proposals.length}`);
    console.log(`   Por día: ${proposals.length / 31}`);
    console.log(`   Por instructor: ${proposals.length / instructors.length}`);
    console.log(`   Slots por día: ${(proposals.length / 31) / instructors.length}`);
    
    // Insertar en lotes de 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < proposals.length; i += batchSize) {
      const batch = proposals.slice(i, i + batchSize);
      await prisma.timeSlot.createMany({
        data: batch
      });
      inserted += batch.length;
      process.stdout.write(`\r   Insertadas: ${inserted}/${proposals.length}`);
    }
    
    console.log('\n\n✅ Propuestas insertadas exitosamente!');
    
    // Verificar
    const total = await prisma.timeSlot.count({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-01T00:00:00'),
          lte: new Date('2025-10-31T23:59:59')
        }
      }
    });
    
    console.log(`\n🔍 Verificación: ${total} propuestas en octubre`);
    
    // Verificar distribución por minutos
    const allProposals = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-21T00:00:00'),
          lte: new Date('2025-10-21T23:59:59')
        }
      },
      select: { start: true }
    });
    
    const at00 = allProposals.filter(p => p.start.getMinutes() === 0).length;
    const at30 = allProposals.filter(p => p.start.getMinutes() === 30).length;
    
    console.log(`\n📊 Oct 21 - Distribución:`);
    console.log(`   :00 -> ${at00} propuestas`);
    console.log(`   :30 -> ${at30} propuestas`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateFullOctober();
