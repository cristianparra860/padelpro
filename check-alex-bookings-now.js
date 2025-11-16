const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlexBookings() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: 'cmhkwi8so0001tggo0bwojrjy'
      },
      include: {
        timeSlot: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`📊 Alex tiene ${bookings.length} reservas:\n`);
    
    bookings.forEach((b, idx) => {
      console.log(`${idx + 1}. TimeSlot: ${b.timeSlotId}`);
      console.log(`   Fecha: ${b.timeSlot.start}`);
      console.log(`   Estado: ${b.status}`);
      console.log(`   Grupo: ${b.groupSize} jugador(es)`);
      console.log(`   Pista: ${b.timeSlot.courtNumber || 'SIN ASIGNAR'}`);
      console.log(`   Categoría: ${b.timeSlot.genderCategory || 'SIN ASIGNAR'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlexBookings();
