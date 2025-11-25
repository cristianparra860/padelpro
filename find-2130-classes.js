const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAll2130() {
  // Buscar TODAS las clases a las 21:30 (cualquier día)
  const classes = await prisma.$queryRaw`
    SELECT 
      id,
      start,
      instructorId,
      courtId,
      (SELECT COUNT(*) FROM Booking WHERE timeSlotId = TimeSlot.id) as booking_count
    FROM TimeSlot
    WHERE strftime('%H:%M', start) = '21:30'
    ORDER BY start
  `;
  
  console.log(`=== CLASES A LAS 21:30 UTC (22:30 local) ===\n`);
  console.log(`Total encontradas: ${classes.length}\n`);
  
  classes.forEach(cls => {
    console.log(`${cls.start}`);
    console.log(`  ID: ${cls.id}`);
    console.log(`  Bookings: ${cls.booking_count}`);
    console.log(`  CourtId: ${cls.courtId}\n`);
  });
  
  // Si hay clases, eliminarlas
  if (classes.length > 0) {
    console.log('  Estas clases están FUERA del horario correcto');
    console.log('   El horario debe ser 06:00-20:30 UTC (07:00-21:30 local)\n');
    
    const ids = classes.map(c => c.id);
    
    // Eliminar bookings primero
    const bookingsDeleted = await prisma.booking.deleteMany({
      where: { timeSlotId: { in: ids } }
    });
    
    // Eliminar timeslots
    const slotsDeleted = await prisma.timeSlot.deleteMany({
      where: { id: { in: ids } }
    });
    
    console.log(` Eliminados: ${bookingsDeleted.count} bookings`);
    console.log(` Eliminados: ${slotsDeleted.count} TimeSlots`);
  }
  
  await prisma.$disconnect();
}

findAll2130();
