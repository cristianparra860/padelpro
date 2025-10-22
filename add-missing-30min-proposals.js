// Agregar propuestas faltantes en los minutos :30
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissing30MinProposals() {
  console.log('🔧 Agregando propuestas faltantes en minutos :30...\n');

  try {
    const instructors = await prisma.instructor.findMany();
    console.log(`👥 Instructores: ${instructors.length}\n`);

    const club = await prisma.club.findFirst();
    
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-11-01');
    const categories = ['INICIACION', 'MEDIO', 'AVANZADO'];
    let totalCreated = 0;

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      console.log(`📆 ${d.toDateString()}...`);
      let dayCreated = 0;

      for (const instructor of instructors) {
        // Solo crear en minuto :30
        for (let hour = 8; hour < 22; hour++) {
          const start = new Date(d);
          start.setHours(hour, 30, 0, 0); // Solo :30
          
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + 60);

          const category = categories[hour % categories.length];

          // Verificar si ya existe
          const existing = await prisma.timeSlot.findFirst({
            where: {
              instructorId: instructor.id,
              start: start.toISOString(),
              courtId: null
            }
          });

          if (!existing) {
            await prisma.timeSlot.create({
              data: {
                id: `prop30-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                clubId: club.id,
                courtId: null,
                instructorId: instructor.id,
                start: start.toISOString(),
                end: end.toISOString(),
                maxPlayers: 4,
                totalPrice: 55,
                level: 'INTERMEDIO',
                category: category
              }
            });

            totalCreated++;
            dayCreated++;
          }
        }
      }

      console.log(`   ✅ Creadas ${dayCreated} propuestas\n`);
    }

    console.log(`\n✅ Total propuestas :30 creadas: ${totalCreated}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addMissing30MinProposals();
