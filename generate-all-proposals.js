const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateAllProposals() {
  try {
    console.log('🚀 Generando propuestas para todos los horarios disponibles...\n');

    // Configuración
    const clubId = 'padel-estrella-madrid';
    const daysAhead = 30; // 30 días hacia adelante
    const startHour = 7;
    const endHour = 22;
    const endMinute = 30;
    const slotDurationMinutes = 30;

    // Obtener instructores
    const instructors = await prisma.instructor.findMany({
      where: {
        assignedClubId: clubId,
        isAvailable: true,
      },
    });

    console.log(`✅ Instructores encontrados: ${instructors.length}`);
    instructors.forEach(i => console.log(`   - ${i.name}`));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      const dayOfWeek = currentDate.toLocaleDateString('es-ES', { weekday: 'long' });
      console.log(`\n📅 ${currentDate.toLocaleDateString('es-ES')} (${dayOfWeek})`);

      let dayCreated = 0;
      let daySkipped = 0;

      // Generar slots desde las 7:00 hasta las 22:30
      for (let hour = startHour; hour <= endHour; hour++) {
        const maxMinute = (hour === endHour) ? endMinute : 60;
        
        for (let minute = 0; minute < maxMinute; minute += slotDurationMinutes) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + slotDurationMinutes);

          // Verificar si ya existe
          const existingSlot = await prisma.timeSlot.findFirst({
            where: {
              clubId,
              start: slotStart,
            },
          });

          if (existingSlot) {
            daySkipped++;
            continue;
          }

          // Asignar instructor rotando
          const instructorIndex = totalCreated % instructors.length;
          const assignedInstructor = instructors[instructorIndex];

          // Crear propuesta
          const timeSlotId = `ts-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          
          await prisma.timeSlot.create({
            data: {
              id: timeSlotId,
              clubId,
              instructorId: assignedInstructor.id,
              start: slotStart,
              end: slotEnd,
              courtId: null,
              courtNumber: null,
              level: 'abierto',
              maxPlayers: 4,
              price: 12.50,
              status: 'AVAILABLE',
            },
          });

          dayCreated++;
          totalCreated++;
        }
      }

      console.log(`   ✨ Creados: ${dayCreated} | Omitidos: ${daySkipped}`);
      totalSkipped += daySkipped;
    }

    console.log(`\n✅ GENERACIÓN COMPLETADA`);
    console.log(`   📊 Total creados: ${totalCreated}`);
    console.log(`   ⏭️  Total omitidos: ${totalSkipped}`);
    console.log(`   📅 Días procesados: ${daysAhead}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateAllProposals();
