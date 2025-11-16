const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const schedules = await prisma.instructorSchedule.findMany({
      include: {
        instructor: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: [
        { startTime: 'asc' }
      ],
      take: 50
    });

    console.log(`\n📊 Total bloques de horario de instructores: ${schedules.length}\n`);

    if (schedules.length > 0) {
      // Agrupar por instructor
      const byInstructor = {};
      schedules.forEach(s => {
        const instructorName = s.instructor?.user?.name || 'Sin nombre';
        if (!byInstructor[instructorName]) byInstructor[instructorName] = [];
        
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        const startHour = start.getHours();
        const endHour = end.getHours();
        
        byInstructor[instructorName].push({
          date: start.toLocaleDateString('es-ES'),
          startHour: startHour,
          endHour: endHour,
          occupied: s.isOccupied
        });
      });

      console.log('📅 Horarios por instructor:\n');
      Object.keys(byInstructor).forEach(instructor => {
        console.log(`👨‍🏫 ${instructor}:`);
        const hours = byInstructor[instructor];
        
        // Encontrar hora mínima y máxima
        const minHour = Math.min(...hours.map(h => h.startHour));
        const maxHour = Math.max(...hours.map(h => h.endHour));
        
        console.log(`   ⏰ Horario: ${minHour.toString().padStart(2, '0')}:00 - ${maxHour.toString().padStart(2, '0')}:00`);
        console.log(`   📋 Total bloques: ${hours.length}`);
        console.log(`   🔒 Ocupados: ${hours.filter(h => h.occupied).length}`);
        console.log('');
      });

      // Mostrar primeros 10 bloques
      console.log('📋 Primeros 10 bloques de horario:\n');
      schedules.slice(0, 10).forEach(s => {
        const instructorName = s.instructor?.user?.name || 'Sin nombre';
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        console.log(`  ${instructorName}: ${start.toLocaleString('es-ES')} - ${end.toLocaleTimeString('es-ES')} (Ocupado: ${s.isOccupied ? 'Sí' : 'No'})`);
      });
    } else {
      console.log('❌ No hay horarios de instructores configurados');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
