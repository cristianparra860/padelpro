const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Buscar el instructor Pedro López
    const pedro = await prisma.instructor.findFirst({
      where: { name: { contains: 'Pedro' } }
    });
    
    if (!pedro) {
      console.log('No se encontró instructor Pedro López');
      return;
    }
    
    console.log('Instructor encontrado:', pedro);
    
    // Buscar TimeSlots con Pedro López
    const timeSlots = await prisma.timeSlot.findMany({
      where: { instructorId: pedro.id },
      include: {
        bookings: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log(`\nTimeSlots con Pedro López: ${timeSlots.length}`);
    
    // Buscar todas las reservas (confirmadas y pendientes)
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        timeSlot: {
          instructorId: pedro.id
        }
      },
      include: {
        timeSlot: true,
        user: true
      }
    });
    
    console.log(`\nReservas con Pedro López: ${confirmedBookings.length}`);
    
    confirmedBookings.forEach(booking => {
      console.log('\n--- Reserva ---');
      console.log(`Usuario: ${booking.user.name} (${booking.user.email})`);
      console.log(`TimeSlot ID: ${booking.timeSlotId}`);
      console.log(`Fecha: ${new Date(booking.timeSlot.start).toLocaleString()}`);
      console.log(`Nivel: ${booking.timeSlot.level}`);
      console.log(`Género: ${booking.timeSlot.genderCategory}`);
      console.log(`groupSize: ${booking.groupSize}`);
      console.log(`courtId: ${booking.timeSlot.courtId}`);
    });
    
  } finally {
    await prisma.$disconnect();
  }
}

main();
