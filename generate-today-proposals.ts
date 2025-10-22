import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateProposalsForToday() {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    const day = today.getDate();
    
    console.log(`\n📅 Generando propuestas para HOY: ${year}-${month + 1}-${day}\n`);
    console.log(`📅 Fecha completa: ${new Date(year, month, day)}\n`);
    
    // Obtener instructores
    const instructors = await prisma.instructor.findMany({
      where: { clubId: 'club-1' }
    });
    
    console.log(`👨‍🏫 Instructores encontrados: ${instructors.length}\n`);
    
    // Primero, eliminar propuestas existentes para hoy
    const startOfToday = new Date(year, month, day, 0, 0, 0);
    const endOfToday = new Date(year, month, day, 23, 59, 59);
    
    const existingToday = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      select: { id: true }
    });
    
    if (existingToday.length > 0) {
      console.log(`🗑️  Eliminando ${existingToday.length} propuestas existentes para hoy...\n`);
      await prisma.timeSlot.deleteMany({
        where: {
          id: { in: existingToday.map(p => p.id) }
        }
      });
    }
    
    // Generar propuestas
    const proposals = [];
    
    for (let hour = 8; hour < 22; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 21 && minute === 30) break;
        
        const startDate = new Date(year, month, day, hour, minute, 0);
        const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);
        
        for (const instructor of instructors) {
          proposals.push({
            clubId: 'club-1',
            instructorId: instructor.id,
            courtId: null,
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
    
    console.log(`💾 Insertando ${proposals.length} propuestas...\n`);
    
    if (proposals.length > 0) {
      console.log(`📝 Ejemplo de propuesta a insertar:`);
      console.log(`   Start: ${proposals[0].start}`);
      console.log(`   End: ${proposals[0].end}\n`);
    }
    
    await prisma.timeSlot.createMany({
      data: proposals
    });
    
    console.log(`✅ COMPLETADO!`);
    console.log(`\n📊 Resumen:`);
    console.log(`   Fecha: ${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    console.log(`   Horarios: 08:00 - 21:00 (cada 30 min)`);
    console.log(`   Total propuestas: ${proposals.length}`);
    console.log(`   Por instructor: ${proposals.length / instructors.length}`);
    console.log('');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

generateProposalsForToday();
