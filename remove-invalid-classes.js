const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeInvalidClasses() {
  console.log('=== ENCONTRANDO CLASES FUERA DE HORARIO ===\n');
  
  // Encontrar clases después de 20:30 UTC
  const invalid = await prisma.timeSlot.findMany({
    where: {
      start: { gte: new Date('2025-12-17T21:30:00.000Z'), lt: new Date('2025-12-17T22:00:00.000Z') }
    },
    include: {
      bookings: { select: { id: true, groupSize: true, status: true } },
      instructor: { select: { name: true } }
    }
  });
  
  console.log(`Encontradas: ${invalid.length} clases\n`);
  
  invalid.forEach(cls => {
    const totalPlayers = cls.bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    console.log(`${cls.start} - ${cls.instructor?.name}`);
    console.log(`  Bookings: ${cls.bookings.length} (${totalPlayers} players)`);
    console.log(`  ID: ${cls.id}\n`);
  });
  
  if (invalid.length > 0) {
    console.log('  Eliminando clases fuera de horario...\n');
    
    // Primero eliminar bookings
    let deletedBookings = 0;
    for (const cls of invalid) {
      const bookingIds = cls.bookings.map(b => b.id);
      if (bookingIds.length > 0) {
        await prisma.booking.deleteMany({
          where: { id: { in: bookingIds } }
        });
        deletedBookings += bookingIds.length;
      }
    }
    
    // Luego eliminar timeslots
    const result = await prisma.timeSlot.deleteMany({
      where: { id: { in: invalid.map(c => c.id) } }
    });
    
    console.log(` Eliminados: ${deletedBookings} bookings`);
    console.log(` Eliminados: ${result.count} TimeSlots`);
  }
  
  await prisma.$disconnect();
}

removeInvalidClasses();
