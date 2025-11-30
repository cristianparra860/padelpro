const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fillMissingSlots() {
  try {
    console.log('🔄 Llenando horas faltantes en el calendario...\n');

    const clubId = 'padel-estrella-madrid';
    
    // Obtener instructores activos
    const instructors = await prisma.instructor.findMany({
      where: {
        clubId: clubId,
        isActive: true
      }
    });

    if (instructors.length === 0) {
      console.log('❌ No hay instructores activos');
      return;
    }

    console.log(`👥 Instructores activos: ${instructors.length}\n`);

    // Generar propuestas para los próximos 60 días desde HOY
    const daysAhead = 60;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let totalCreated = 0;
    let totalExisting = 0;

    console.log('📅 Generando slots para 7:00 - 22:30...\n');

    for (let day = 0; day < daysAhead; day++) {
      const currentDate = new Date(now);
      currentDate.setDate(now.getDate() + day);

      // TODAS las horas de 7:00 a 22:30
      const timeSlots = [
        '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
        '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
        '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
        '22:00', '22:30'
      ];

      for (const timeStr of timeSlots) {
        const [hour, minute] = timeStr.split(':').map(Number);
        
        const startTime = new Date(currentDate);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);

        const startTs = BigInt(startTime.getTime());
        const endTs = BigInt(endTime.getTime());

        // Verificar si existe
        const existing = await prisma.$queryRaw`
          SELECT id FROM TimeSlot 
          WHERE clubId = ${clubId} 
          AND start = ${startTs}
          LIMIT 1
        `;

        if (existing && existing.length > 0) {
          totalExisting++;
          continue;
        }

        // Rotar instructor
        const instructorIndex = (totalCreated + totalExisting) % instructors.length;
        const instructor = instructors[instructorIndex];

        // Crear slot
        await prisma.$executeRaw`
          INSERT INTO TimeSlot (
            id, clubId, instructorId, start, end, maxPlayers,
            totalPrice, instructorPrice, courtRentalPrice,
            level, category, genderCategory, courtId, createdAt, updatedAt
          ) VALUES (
            ${`ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`},
            ${clubId},
            ${instructor.id},
            ${startTs},
            ${endTs},
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

      if ((day + 1) % 10 === 0) {
        console.log(`   ✅ ${day + 1}/${daysAhead} días procesados`);
      }
    }

    console.log('\n📊 RESULTADO:');
    console.log(`   ✅ Propuestas nuevas: ${totalCreated}`);
    console.log(`   ⏭️  Ya existentes: ${totalExisting}`);
    console.log(`   📅 Días: ${daysAhead}`);
    console.log(`   ⏰ Slots por día: 32 (7:00-22:30)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

fillMissingSlots();
