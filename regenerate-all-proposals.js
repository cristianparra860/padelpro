const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateAll() {
  try {
    console.log('🔄 Regenerando TODAS las propuestas correctamente...\n');

    const clubId = 'padel-estrella-madrid';

    // 1. Eliminar TODAS las propuestas existentes (courtId = NULL)
    console.log('1️⃣ Eliminando propuestas existentes...');
    const deleted = await prisma.$executeRaw`
      DELETE FROM TimeSlot 
      WHERE clubId = ${clubId} 
      AND courtId IS NULL
    `;
    console.log(`   ✅ ${deleted} propuestas eliminadas\n`);

    // 2. Obtener instructores
    const instructors = await prisma.instructor.findMany({
      where: { clubId, isActive: true }
    });

    if (instructors.length === 0) {
      console.log('❌ No hay instructores activos');
      return;
    }

    console.log(`2️⃣ Instructores activos: ${instructors.length}\n`);

    // 3. Generar propuestas para 60 días
    console.log('3️⃣ Generando propuestas...\n');
    
    const daysAhead = 60;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    let totalCreated = 0;

    for (let day = 0; day < daysAhead; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      // Horarios de 7:00 a 22:30
      const times = [
        '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
        '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
        '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
        '22:00', '22:30'
      ];

      for (const timeStr of times) {
        const [hour, minute] = timeStr.split(':').map(Number);
        
        const start = new Date(currentDate);
        start.setHours(hour, minute, 0, 0);
        
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30);

        const instructor = instructors[totalCreated % instructors.length];

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

      if ((day + 1) % 10 === 0) {
        console.log(`   ✅ Día ${day + 1}/${daysAhead} - ${totalCreated} slots creados`);
      }
    }

    console.log('\n✅ COMPLETADO:');
    console.log(`   📊 Total propuestas: ${totalCreated}`);
    console.log(`   📅 Días: ${daysAhead}`);
    console.log(`   ⏰ Por día: 32 slots (7:00-22:30, cada 30min)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

regenerateAll();
