// Generar propuestas para octubre de 2025 (cada 30 minutos)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateOctoberProposals() {
  console.log('🔧 Generando propuestas para octubre 2025...\n');

  try {
    // Obtener instructores
    const instructors = await prisma.instructor.findMany();
    console.log(`👥 Instructores encontrados: ${instructors.length}\n`);

    if (instructors.length === 0) {
      console.log('❌ No hay instructores en la base de datos!');
      return;
    }

    // Obtener el club
    const club = await prisma.club.findFirst();
    if (!club) {
      console.log('❌ No hay club en la base de datos!');
      return;
    }

    // Configuración
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-11-01');
    const categories = ['INICIACION', 'MEDIO', 'AVANZADO'];
    let totalCreated = 0;

    console.log(`📅 Generando desde ${startDate.toDateString()} hasta ${endDate.toDateString()}\n`);

    // Para cada día
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      
      // Saltar domingos (0) si quieres
      // if (dayOfWeek === 0) continue;

      console.log(`📆 Procesando ${d.toDateString()}...`);
      let dayCreated = 0;

      // Para cada instructor
      for (const instructor of instructors) {
        // Generar slots cada 30 minutos de 08:00 a 22:00
        for (let hour = 8; hour < 22; hour++) {
          for (let minute of [0, 30]) {
            const start = new Date(d);
            start.setHours(hour, minute, 0, 0);
            
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 60); // Clases de 60 minutos

            // Rotar categorías
            const category = categories[(hour + minute / 30) % categories.length];

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
                  id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  clubId: club.id,
                  courtId: null, // Propuesta sin pista
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
      }

      console.log(`   ✅ Creadas ${dayCreated} propuestas para este día\n`);
    }

    console.log(`\n✅ Total propuestas creadas: ${totalCreated}`);
    console.log(`📊 Propuestas por instructor: ${Math.floor(totalCreated / instructors.length)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateOctoberProposals();
