/**
 * Forzar generación de TimeSlots desde día 21 en adelante
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceGenerateFrom21() {
  console.log('\n🔧 FORZAR GENERACIÓN DESDE DÍA 21\n');
  console.log('='.repeat(70));

  try {
    const clubId = 'padel-estrella-madrid';
    const day21 = new Date(2025, 10, 21, 7, 0, 0, 0); // 21 Nov 2025, 07:00
    const day28 = new Date(2025, 10, 28, 23, 0, 0, 0); // 28 Nov 2025, 23:00 (7 días)
    
    console.log(`📅 Generando slots del ${day21.toLocaleDateString('es-ES')} al ${day28.toLocaleDateString('es-ES')}\n`);

    // Obtener instructores
    const instructors = await prisma.instructor.findMany({
      where: { clubId: clubId }
    });

    console.log(`👨‍🏫 Instructores encontrados: ${instructors.length}\n`);

    let created = 0;
    let skipped = 0;

    // Generar slots para cada día
    for (let day = new Date(day21); day < day28; day.setDate(day.getDate() + 1)) {
      const dayStart = new Date(day);
      dayStart.setHours(7, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 0, 0, 0);

      console.log(`📅 Generando para: ${dayStart.toLocaleDateString('es-ES')}`);

      // Para cada instructor
      for (const instructor of instructors) {
        // Generar slots cada 30 minutos (07:00, 07:30, 08:00, etc.)
        for (let hour = 7; hour < 23; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const start = new Date(day);
            start.setHours(hour, minute, 0, 0);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 90); // 1.5 horas

            // Verificar si ya existe
            const existing = await prisma.timeSlot.findFirst({
              where: {
                clubId: clubId,
                instructorId: instructor.id,
                start: start
              }
            });

            if (existing) {
              skipped++;
              continue;
            }

            // Crear slot
            await prisma.timeSlot.create({
              data: {
                clubId: clubId,
                instructorId: instructor.id,
                start: start,
                end: end,
                maxPlayers: 4,
                totalPrice: 2500, // €25
                instructorPrice: 1500, // €15
                courtRentalPrice: 1000, // €10
                level: 'ABIERTO',
                category: 'class',
                courtId: null,
                courtNumber: null,
                genderCategory: null
              }
            });

            created++;
          }
        }
      }

      console.log(`   ✅ Día completo: ${created} slots creados, ${skipped} ya existían`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ COMPLETADO: ${created} nuevos slots creados\n`);

    // Verificar día 21
    const day21Slots = await prisma.timeSlot.count({
      where: {
        clubId: clubId,
        start: {
          gte: new Date(2025, 10, 21, 0, 0, 0, 0),
          lt: new Date(2025, 10, 22, 0, 0, 0, 0)
        }
      }
    });

    console.log(`📊 Slots en día 21: ${day21Slots}`);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceGenerateFrom21();
