const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosClasses() {
  try {
    const slots = await prisma.timeSlot.findMany({
      where: {
        instructorId: 'cmjn2528h0001tgysr5c6j7pd'
      },
      orderBy: {
        start: 'asc'
      },
      take: 20,
      include: {
        bookings: {
          include: {
            user: true
          }
        }
      }
    });

    console.log('📊 Primeras 20 clases de Carlos Rodriguez:');
    console.log(`Total encontradas: ${slots.length}\n`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    slots.forEach((s, i) => {
      const startDate = new Date(s.start);
      const isPast = startDate < today;
      const bookingsCount = s.bookings?.length || 0;
      
      console.log(`${i + 1}. ${startDate.toLocaleString('es-ES')}`);
      console.log(`   ID: ${s.id.substring(0, 20)}...`);
      console.log(`   CourtId: ${s.courtId || 'NULL (propuesta)'}`);
      console.log(`   MaxPlayers: ${s.maxPlayers}`);
      console.log(`   Bookings: ${bookingsCount}`);
      console.log(`   Status: ${isPast ? '❌ PASADA' : '✅ PRÓXIMA'}`);
      if (bookingsCount > 0) {
        s.bookings.forEach(b => {
          console.log(`      - ${b.user.name} (${b.status})`);
        });
      }
      console.log('');
    });

    // Verificar cuántas son próximas
    const futureSlots = slots.filter(s => new Date(s.start) >= today);
    const pastSlots = slots.filter(s => new Date(s.start) < today);

    console.log('\n📈 Resumen:');
    console.log(`   Clases próximas: ${futureSlots.length}`);
    console.log(`   Clases pasadas: ${pastSlots.length}`);
    console.log(`   Propuestas (sin pista): ${slots.filter(s => !s.courtId).length}`);
    console.log(`   Confirmadas (con pista): ${slots.filter(s => s.courtId).length}`);
    console.log(`   Con inscripciones: ${slots.filter(s => s.bookings?.length > 0).length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCarlosClasses();
