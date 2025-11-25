import { prisma } from './src/lib/prisma.ts';

async function checkInstructorAvailability() {
  try {
    console.log('🔍 REVISANDO DISPONIBILIDAD DE INSTRUCTORES\n');
    
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      include: {
        availability: true,
        schedule: true
      }
    });
    
    console.log(`👨‍🏫 Instructores activos: ${instructors.length}\n`);
    
    instructors.forEach(i => {
      console.log(`\n📋 ${i.name} (${i.id}):`);
      console.log(`   isActive: ${i.isActive}`);
      console.log(`   clubId: ${i.clubId}`);
      
      console.log(`\n   📅 InstructorAvailability (${i.availability.length}):`);
      if (i.availability.length === 0) {
        console.log('      ❌ NO HAY DISPONIBILIDAD CONFIGURADA');
      } else {
        i.availability.forEach(a => {
          console.log(`      ${a.dayOfWeek} | ${a.startTime} - ${a.endTime}`);
        });
      }
      
      console.log(`\n   📆 InstructorSchedule (${i.schedule.length}):`);
      if (i.schedule.length > 0) {
        i.schedule.slice(0, 5).forEach(s => {
          const date = new Date(Number(s.date));
          console.log(`      ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} | ${s.isOccupied ? '🔴 OCUPADO' : '🟢 LIBRE'}`);
        });
        if (i.schedule.length > 5) {
          console.log(`      ... y ${i.schedule.length - 5} más`);
        }
      }
    });
    
    // Revisar CourtSchedule también
    console.log('\n\n🏟️ COURT SCHEDULE:\n');
    
    const courtSchedules = await prisma.courtSchedule.findMany({
      take: 10,
      orderBy: { date: 'asc' }
    });
    
    console.log(`📊 Total registros: ${await prisma.courtSchedule.count()}`);
    
    if (courtSchedules.length > 0) {
      console.log('\nPrimeros registros:');
      courtSchedules.forEach(cs => {
        const date = new Date(Number(cs.date));
        console.log(`   Pista ${cs.courtId} | ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} | ${cs.isOccupied ? '🔴 OCUPADA' : '🟢 LIBRE'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorAvailability();
