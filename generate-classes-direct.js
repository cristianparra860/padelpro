const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateClasses() {
  try {
    console.log('🤖 Generando propuestas de clases...\n');

    const clubId = 'padel-estrella-madrid';
    
    // Obtener instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true, clubId }
    });

    console.log(`👥 Instructores activos: ${instructors.length}`);

    if (instructors.length === 0) {
      console.log('❌ No hay instructores activos');
      return;
    }

    let totalCreated = 0;
    const today = new Date();

    // Generar para los próximos 30 días
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);

      console.log(`\n📅 Generando para ${targetDate.toLocaleDateString('es-ES')}...`);

      // Generar horarios cada 30 minutos de 08:00 a 22:00
      for (let hour = 8; hour < 22; hour++) {
        for (const minute of [0, 30]) {
          // Para cada instructor
          for (const instructor of instructors) {
            // Crear timestamp de inicio
            const start = new Date(targetDate);
            start.setHours(hour, minute, 0, 0);

            // Crear timestamp de fin (60 minutos después)
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 60);

            // Crear TimeSlot
            const timeSlotId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await prisma.timeSlot.create({
              data: {
                id: timeSlotId,
                clubId,
                instructorId: instructor.id,
                start: start.toISOString(),
                end: end.toISOString(),
                maxPlayers: 4,
                instructorPrice: 15,
                courtRentalPrice: 10,
                totalPrice: 25,
                level: 'ABIERTO',
                category: 'ABIERTO'
              }
            });

            totalCreated++;
          }
        }
      }

      console.log(`   ✅ Creadas: ${28 * instructors.length} propuestas`);
    }

    console.log(`\n✅ Total creadas: ${totalCreated} propuestas`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateClasses();
