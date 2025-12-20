const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNineAMGeneration() {
  try {
    const clubId = 'padel-estrella-madrid';
    const targetDate = new Date('2025-12-22T09:00:00.000Z');
    
    console.log('📅 Verificando generación de clases para:', targetDate.toISOString());
    console.log('');
    
    // 1. Verificar horarios de apertura del club
    const club = await prisma.club.findUnique({
      where: { id: clubId }
    });
    
    console.log('🏢 Horarios del club:', club?.openingHours);
    console.log('');
    
    // 2. Verificar instructores
    const instructors = await prisma.instructor.findMany({
      where: { clubId }
    });
    
    console.log(`👥 Instructores encontrados: ${instructors.length}`);
    console.log('');
    
    // 3. Para cada instructor, verificar disponibilidad a las 9:00
    for (const instructor of instructors) {
      console.log(`\n👤 ${instructor.name}:`);
      
      // Verificar InstructorSchedule
      const schedules = await prisma.$queryRaw`
        SELECT * FROM InstructorSchedule
        WHERE instructorId = ${instructor.id}
        AND date = ${targetDate.getTime()}
      `;
      
      console.log(`  - Schedules a las 9:00:`, schedules.length > 0 ? schedules : 'Ninguno');
      
      // Verificar clases confirmadas
      const confirmedClasses = await prisma.timeSlot.findMany({
        where: {
          instructorId: instructor.id,
          start: targetDate,
          courtId: { not: null }
        }
      });
      
      console.log(`  - Clases confirmadas: ${confirmedClasses.length}`);
      if (confirmedClasses.length > 0) {
        console.log(`    -> Pista ${confirmedClasses[0].courtNumber}`);
      }
      
      // Verificar propuestas
      const proposals = await prisma.timeSlot.findMany({
        where: {
          instructorId: instructor.id,
          start: targetDate,
          courtId: null
        }
      });
      
      console.log(`  - Propuestas: ${proposals.length}`);
    }
    
    // 4. Verificar pistas ocupadas
    console.log('\n\n🎾 Estado de las pistas a las 9:00:');
    const courts = await prisma.court.findMany({
      where: { clubId }
    });
    
    for (const court of courts) {
      const schedule = await prisma.$queryRaw`
        SELECT * FROM CourtSchedule
        WHERE courtId = ${court.id}
        AND date = ${targetDate.getTime()}
      `;
      
      console.log(`  - Pista ${court.courtNumber}: ${schedule.length > 0 ? 'OCUPADA' : 'LIBRE'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNineAMGeneration();
