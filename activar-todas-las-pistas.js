const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activarTodasLasPistas() {
  try {
    console.log('🏟️ Activando TODAS las pistas para todos los días...\n');

    // Obtener todos los clubes
    const clubs = await prisma.club.findMany({
      include: {
        courts: true
      }
    });

    if (clubs.length === 0) {
      console.log('❌ No hay clubes en la base de datos');
      return;
    }

    // Para cada club
    for (const club of clubs) {
      console.log(`\n📍 Club: ${club.name} (${club.courts.length} pistas)`);

      // Generar horarios para los próximos 30 días
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + dayOffset);

        // Para cada pista del club
        for (const court of club.courts) {
          // Generar slots de 30 minutos desde las 6:00 hasta las 22:00
          for (let hour = 6; hour <= 21; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              if (hour === 21 && minute > 30) break; // Parar en 21:30

              const startTime = new Date(currentDate);
              startTime.setHours(hour, minute, 0, 0);

              const endTime = new Date(startTime);
              endTime.setMinutes(endTime.getMinutes() + 30);

              // Verificar si ya existe
              const existing = await prisma.courtSchedule.findFirst({
                where: {
                  courtId: court.id,
                  startTime: startTime
                }
              });

              if (!existing) {
                await prisma.courtSchedule.create({
                  data: {
                    courtId: court.id,
                    date: currentDate,
                    startTime: startTime,
                    endTime: endTime,
                    isOccupied: false
                  }
                });
              }
            }
          }
        }

        if ((dayOffset + 1) % 7 === 0) {
          console.log(`  ✅ Generados ${dayOffset + 1} días`);
        }
      }

      console.log(`✅ ${club.name}: Pistas activadas para 30 días`);
    }

    console.log('\n✅ TODAS las pistas han sido activadas!');
    console.log('📊 Ahora las clases deberían aparecer correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

activarTodasLasPistas();
