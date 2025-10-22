const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSchedules() {
  console.log('\n🕐 SEED: Calendarios de disponibilidad\n');

  try {
    const clubId = 'club-1';

    // 1. Obtener todas las pistas del club
    const courts = await prisma.court.findMany({
      where: { clubId: clubId }
    });

    console.log(`✅ Pistas encontradas: ${courts.length}`);

    // 2. Obtener todos los instructores del club
    const instructors = await prisma.instructor.findMany({
      where: { clubId: clubId }
    });

    console.log(`✅ Instructores encontrados: ${instructors.length}`);

    // 3. Crear disponibilidad para instructores (Lunes a Domingo, 09:00-18:00)
    console.log(`\n📅 Creando disponibilidad de instructores...`);
    
    for (const instructor of instructors) {
      for (let day = 1; day <= 7; day++) { // 1=Lunes, 7=Domingo
        // Horario de mañana: 09:00-13:00
        await prisma.instructorAvailability.create({
          data: {
            instructorId: instructor.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '13:00',
            isActive: true
          }
        });

        // Horario de tarde: 15:00-18:00
        await prisma.instructorAvailability.create({
          data: {
            instructorId: instructor.id,
            dayOfWeek: day,
            startTime: '15:00',
            endTime: '18:00',
            isActive: true
          }
        });

        console.log(`   ✅ ${instructor.name} - Día ${day}: 09:00-13:00, 15:00-18:00`);
      }
    }

    // 4. Crear horario del club (Lunes a Domingo, 08:00-22:00)
    console.log(`\n📅 Creando horario del club...`);
    
    for (let day = 1; day <= 7; day++) {
      await prisma.clubSchedule.upsert({
        where: {
          clubId_dayOfWeek: {
            clubId: clubId,
            dayOfWeek: day
          }
        },
        update: {},
        create: {
          clubId: clubId,
          dayOfWeek: day,
          openTime: '08:00',
          closeTime: '22:00',
          isActive: true
        }
      });
      
      console.log(`   ✅ Día ${day}: 08:00-22:00`);
    }

    console.log(`\n✅ Seed de calendarios completado exitosamente`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSchedules();
