const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateClassesForPedro() {
  try {
    console.log('🚀 Generando clases para Pedro López...\n');

    const clubId = 'club-1';
    const instructorId = 'cmjpd034m0001tgy4pod0inrl'; // Pedro López

    // Generar para los próximos 7 días
    const today = new Date();
    const daysToGenerate = 7;

    let totalCreated = 0;

    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);

      const dateStr = targetDate.toISOString().split('T')[0];
      console.log(`\n📅 Generando clases para ${dateStr}...`);

      // Generar slots cada 30 minutos de 09:00 a 19:00
      const timeSlots = [];
      for (let hour = 9; hour < 19; hour++) {
        timeSlots.push({ hour, minute: 0 });
        timeSlots.push({ hour, minute: 30 });
      }

      for (const { hour, minute } of timeSlots) {
        const start = new Date(targetDate);
        start.setHours(hour, minute, 0, 0);

        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 60); // 60 minutos de duración

        // Verificar si ya existe
        const existing = await prisma.timeSlot.findFirst({
          where: {
            clubId,
            instructorId,
            start: start
          }
        });

        if (existing) {
          console.log(`   ⏭️  ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} - Ya existe`);
          continue;
        }

        // Crear el TimeSlot
        await prisma.timeSlot.create({
          data: {
            clubId,
            instructorId,
            start,
            end,
            maxPlayers: 4,
            totalPrice: 48, // 12€ por persona
            instructorPrice: 28,
            courtRentalPrice: 20,
            level: 'abierto',
            category: 'general',
            levelRange: '0-7', // Todos los niveles
            courtId: null // Propuesta sin pista asignada
          }
        });

        totalCreated++;
        console.log(`   ✅ ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} - Creado`);
      }
    }

    console.log(`\n✅ Total clases creadas: ${totalCreated}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateClassesForPedro();
