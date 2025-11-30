const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateProposalsForAllInstructors() {
  try {
    console.log('🎯 Generando propuestas para TODOS los instructores en TODAS las horas...\n');

    const clubId = 'padel-estrella-madrid';

    // 1. Limpiar propuestas existentes
    console.log('1️⃣ Limpiando propuestas existentes...');
    const deleted = await prisma.$executeRaw`
      DELETE FROM TimeSlot 
      WHERE clubId = ${clubId} 
      AND courtId IS NULL
    `;
    console.log(`   ✅ ${deleted} propuestas eliminadas\n`);

    // 2. Obtener instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { clubId, isActive: true }
    });

    if (instructors.length === 0) {
      console.log('❌ No hay instructores activos');
      return;
    }

    console.log(`2️⃣ Instructores activos: ${instructors.length}`);
    instructors.forEach(i => console.log(`   - ${i.name}`));

    // 3. Generar propuestas
    console.log('\n3️⃣ Generando propuestas...\n');
    
    const daysAhead = 60;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const times = [
      '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
      '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
      '22:00', '22:30'
    ];

    let totalCreated = 0;

    for (let day = 0; day < daysAhead; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      for (const timeStr of times) {
        const [hour, minute] = timeStr.split(':').map(Number);
        
        const start = new Date(currentDate);
        start.setHours(hour, minute, 0, 0);
        
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30);

        // CREAR UNA PROPUESTA POR CADA INSTRUCTOR
        for (const instructor of instructors) {
          await prisma.$executeRaw`
            INSERT INTO TimeSlot (
              id, clubId, instructorId, start, end, maxPlayers,
              totalPrice, instructorPrice, courtRentalPrice,
              level, category, genderCategory, courtId, createdAt, updatedAt
            ) VALUES (
              ${`ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`},
              ${clubId},
              ${instructor.id},
              ${BigInt(start.getTime())},
              ${BigInt(end.getTime())},
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
      }

      if ((day + 1) % 10 === 0) {
        console.log(`   ✅ Día ${day + 1}/${daysAhead} - ${totalCreated} slots creados`);
      }
    }

    console.log('\n✅ COMPLETADO:');
    console.log(`   📊 Total propuestas: ${totalCreated}`);
    console.log(`   📅 Días: ${daysAhead}`);
    console.log(`   👥 Instructores: ${instructors.length}`);
    console.log(`   ⏰ Slots por día por instructor: 32`);
    console.log(`   🎯 Total por día: ${32 * instructors.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

generateProposalsForAllInstructors();
