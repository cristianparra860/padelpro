import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyApiData() {
  try {
    // Contar propuestas en octubre
    const totalProposals = await prisma.timeSlot.count({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-01T00:00:00'),
          lte: new Date('2025-10-31T23:59:59')
        }
      }
    });
    
    console.log(`\n📊 Total propuestas en DB: ${totalProposals}`);
    
    // Verificar Oct 23 específicamente
    const oct23Proposals = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-23T00:00:00'),
          lte: new Date('2025-10-23T23:59:59')
        }
      },
      select: {
        id: true,
        start: true,
        instructorId: true,
        courtId: true
      },
      orderBy: { start: 'asc' }
    });
    
    console.log(`\n📅 Propuestas Oct 23: ${oct23Proposals.length}`);
    
    // Agrupar por minutos
    const at00 = oct23Proposals.filter(p => p.start.getMinutes() === 0);
    const at30 = oct23Proposals.filter(p => p.start.getMinutes() === 30);
    
    console.log(`   :00 -> ${at00.length} propuestas`);
    console.log(`   :30 -> ${at30.length} propuestas`);
    
    // Mostrar primeros 10 slots
    console.log('\n🔍 Primeros 10 slots de Oct 23:');
    oct23Proposals.slice(0, 10).forEach((p, i) => {
      const time = p.start.toISOString().slice(11, 16);
      console.log(`   ${i + 1}. ${time} - Instructor: ${p.instructorId} - courtId: ${p.courtId}`);
    });
    
    // Verificar qué devuelve el query SQL del API
    console.log('\n🔧 Simulando query del API...');
    const startDate = '2025-09-30T22:00:00.000Z';
    const endDate = '2025-10-31T22:59:59.999Z';
    
    const classesRaw = await prisma.$queryRaw`
      SELECT 
        id, start, end, maxPlayers, totalPrice, level, category, 
        courtId, instructorId
      FROM TimeSlot
      WHERE start >= ${startDate}
        AND start <= ${endDate}
      ORDER BY start ASC
    ` as any[];
    
    console.log(`\n📡 Query SQL devuelve: ${classesRaw.length} clases`);
    
    const proposed = classesRaw.filter((c: any) => c.courtId === null);
    const confirmed = classesRaw.filter((c: any) => c.courtId !== null);
    
    console.log(`   Propuestas (courtId = null): ${proposed.length}`);
    console.log(`   Confirmadas (courtId != null): ${confirmed.length}`);
    
    // Ver primeras 5 propuestas del query SQL
    console.log('\n📋 Primeras 5 propuestas del SQL:');
    proposed.slice(0, 5).forEach((p: any, i: number) => {
      console.log(`   ${i + 1}. ${p.start} - courtId: ${p.courtId}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyApiData();
