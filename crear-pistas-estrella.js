const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearPistasYActivarlas() {
  try {
    console.log('🏟️  Creando pistas para Padel Estrella Madrid...\n');

    const club = await prisma.club.findUnique({
      where: { id: 'padel-estrella-madrid' },
      include: { courts: true }
    });

    if (!club) {
      console.log('❌ Club no encontrado');
      return;
    }

    console.log(`📍 Club: ${club.name}`);
    console.log(`📊 Pistas actuales: ${club.courts.length}\n`);

    // Crear 4 pistas si no existen
    const pistasACrear = 4;
    const courtIds = [];

    for (let i = 1; i <= pistasACrear; i++) {
      const courtId = `court-padel-estrella-${i}`;
      
      // Verificar si ya existe
      const existing = await prisma.court.findUnique({
        where: { id: courtId }
      });

      if (!existing) {
        const court = await prisma.court.create({
          data: {
            id: courtId,
            clubId: club.id,
            number: i,
            name: `Pista ${i}`,
            capacity: 4,
            isActive: true
          }
        });
        console.log(`✅ Pista ${i} creada (${courtId})`);
        courtIds.push(court.id);
      } else {
        console.log(`ℹ️  Pista ${i} ya existe (${courtId})`);
        courtIds.push(existing.id);
      }
    }

    // Ahora activar los horarios para las próximas 30 días
    console.log(`\n⏰ Activando horarios para 30 días...`);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    let totalCreated = 0;

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + dayOffset);

      // Para cada pista
      for (const courtId of courtIds) {
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
                courtId: courtId,
                startTime: startTime
              }
            });

            if (!existing) {
              await prisma.courtSchedule.create({
                data: {
                  courtId: courtId,
                  date: currentDate,
                  startTime: startTime,
                  endTime: endTime,
                  isOccupied: false
                }
              });
              totalCreated++;
            }
          }
        }
      }

      if ((dayOffset + 1) % 7 === 0) {
        console.log(`  ✅ Generados ${dayOffset + 1} días`);
      }
    }

    console.log(`\n✅ ${pistasACrear} pistas creadas/verificadas`);
    console.log(`✅ ${totalCreated} horarios creados`);
    console.log(`\n📊 Ahora las clases deberían aparecer correctamente!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

crearPistasYActivarlas();
