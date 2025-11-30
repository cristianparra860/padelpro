const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateAllProposals() {
  try {
    console.log('🚀 Generando propuestas para TODOS los horarios disponibles...\n');

    const clubId = 'padel-estrella-madrid';
    
    // Obtener instructores activos
    const instructors = await prisma.instructor.findMany({
      where: {
        clubId: clubId,
        isActive: true
      }
    });

    console.log(`👥 Instructores activos: ${instructors.length}`);
    if (instructors.length === 0) {
      console.log('❌ No hay instructores activos. Abortando...');
      return;
    }

    // Generar para los próximos 60 días
    const daysAhead = 60;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    let totalCreated = 0;
    let totalSkipped = 0;

    console.log(`📅 Generando propuestas para ${daysAhead} días...\n`);

    for (let day = 0; day < daysAhead; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Generar slots de 7:00 a 22:30 cada 30 minutos
      const hours = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
                     '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                     '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
                     '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];

      for (const timeStr of hours) {
        const [hour, minute] = timeStr.split(':').map(Number);
        
        const startTime = new Date(currentDate);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);

        const startTimestamp = BigInt(startTime.getTime());
        const endTimestamp = BigInt(endTime.getTime());

        // Verificar si ya existe un slot en ese horario usando SQL raw
        const existing = await prisma.$queryRaw`
          SELECT id FROM TimeSlot 
          WHERE clubId = ${clubId} 
          AND start = ${startTimestamp} 
          AND end = ${endTimestamp}
          LIMIT 1
        `;

        if (existing && existing.length > 0) {
          totalSkipped++;
          continue;
        }

        // Rotar instructor
        const instructorIndex = totalCreated % instructors.length;
        const instructor = instructors[instructorIndex];

        // Crear la propuesta usando SQL raw
        await prisma.$executeRaw`
          INSERT INTO TimeSlot (
            id, clubId, instructorId, start, end, maxPlayers, 
            totalPrice, instructorPrice, courtRentalPrice, 
            level, category, genderCategory, courtId, createdAt, updatedAt
          ) VALUES (
            ${`ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`},
            ${clubId},
            ${instructor.id},
            ${startTimestamp},
            ${endTimestamp},
            4,
            25.0,
            15.0,
            10.0,
            'ABIERTO',
            'clase',
            'mixto',
            NULL,
            ${BigInt(Date.now())},
            ${BigInt(Date.now())}
          )
        `;

        totalCreated++;
      }

      // Progreso cada 10 días
      if ((day + 1) % 10 === 0) {
        console.log(`   ✅ Día ${day + 1}/${daysAhead} completado - ${totalCreated} propuestas creadas`);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Propuestas creadas: ${totalCreated}`);
    console.log(`   ⏭️  Slots existentes omitidos: ${totalSkipped}`);
    console.log(`   📅 Días generados: ${daysAhead}`);
    console.log(`   ⏰ Horarios por día: ${32} (7:00 - 22:30, cada 30min)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

generateAllProposals();
