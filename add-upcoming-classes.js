const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addClassesForUpcomingDays() {
  try {
    console.log('🚀 Agregando clases para los próximos días...\n');

    // Obtener datos base para crear las clases
    const existingInstructor = await prisma.instructor.findFirst();
    const existingCourt = await prisma.court.findFirst();
    const existingClub = await prisma.club.findFirst();

    if (!existingInstructor || !existingCourt || !existingClub) {
      console.error('❌ No se encontraron datos base (instructor, pista o club)');
      return;
    }

    console.log('✅ Datos base encontrados:');
    console.log(`   👨‍🏫 Instructor: ${existingInstructor.name} (${existingInstructor.id})`);
    console.log(`   🏟️ Pista: ${existingCourt.name} (${existingCourt.id})`);
    console.log(`   🏢 Club: ${existingClub.name} (${existingClub.id})\n`);

    // Definir las clases a crear para cada día
    const classTemplates = [
      { startHour: 8, endHour: 10, name: 'Clase Matutina' },
      { startHour: 10, endHour: 11.5, name: 'Clase Media Mañana' },
      { startHour: 12, endHour: 14, name: 'Clase Mediodía' },
      { startHour: 16, endHour: 17.5, name: 'Clase Tarde' },
      { startHour: 18, endHour: 20, name: 'Clase Nocturna' },
      { startHour: 20, endHour: 21.5, name: 'Clase Noche' }
    ];

    // Crear clases para los próximos 7 días desde HOY
    const startDate = new Date(); // Empezar desde hoy
    startDate.setHours(0, 0, 0, 0); // Resetear a medianoche
    const classesToCreate = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);
      
      console.log(`📅 Preparando clases para: ${currentDate.toISOString().split('T')[0]}`);
      
      for (const template of classTemplates) {
        // Crear fecha y hora de inicio
        const startTime = new Date(currentDate);
        startTime.setHours(Math.floor(template.startHour), (template.startHour % 1) * 60, 0, 0);
        
        // Crear fecha y hora de fin
        const endTime = new Date(currentDate);
        endTime.setHours(Math.floor(template.endHour), (template.endHour % 1) * 60, 0, 0);
        
        classesToCreate.push({
          clubId: existingClub.id,
          courtId: existingCourt.id,
          instructorId: existingInstructor.id,
          start: startTime,
          end: endTime,
          maxPlayers: 4,
          totalPrice: 35,
          level: 'intermedio',
          category: 'clase_grupal',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    console.log(`\n🎯 Total de clases a crear: ${classesToCreate.length}`);
    console.log(`📊 Clases por día: ${classTemplates.length}`);
    console.log(`📅 Días: 7 (del 25 septiembre al 1 octubre)\n`);

    // Crear las clases en la base de datos
    console.log('💾 Insertando clases en la base de datos...');
    
    const result = await prisma.timeSlot.createMany({
      data: classesToCreate
    });

    console.log(`✅ ${result.count} clases creadas exitosamente!`);

    // Verificar el resultado
    console.log('\n🔍 Verificando clases creadas...');
    const allTimeSlots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: new Date('2025-09-25T00:00:00'),
          lte: new Date('2025-10-01T23:59:59')
        }
      },
      orderBy: {
        start: 'asc'
      }
    });

    // Agrupar por fecha
    const classesByDate = {};
    allTimeSlots.forEach(slot => {
      const date = slot.start.toISOString().split('T')[0];
      if (!classesByDate[date]) {
        classesByDate[date] = [];
      }
      classesByDate[date].push(slot);
    });

    console.log('\n📅 Resumen de clases por fecha:');
    Object.keys(classesByDate).sort().forEach(date => {
      const classes = classesByDate[date];
      console.log(`📅 ${date}: ${classes.length} clases`);
      classes.forEach((cls, index) => {
        const startTime = cls.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const endTime = cls.end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${index + 1}. ${startTime}-${endTime} | Max: ${cls.maxPlayers} | €${cls.totalPrice}`);
      });
    });

  } catch (error) {
    console.error('❌ Error creando clases:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addClassesForUpcomingDays();