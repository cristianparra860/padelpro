const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n📅 BUSCANDO CLASES DEL 30 NOV 09:00\n');
    
    // Timestamp del 30 de nov a las 9:00
    const targetTimestamp = 1764493200000;
    
    const classes = await prisma.$queryRawUnsafe(
      'SELECT id, instructorId, start, end, courtId, level, maxPlayers FROM TimeSlot WHERE start = ?',
      targetTimestamp
    );
    
    console.log(`📊 Clases encontradas: ${classes.length}\n`);
    
    if (classes.length === 0) {
      console.log('❌ No hay clases el 30/11 a las 9:00');
      return;
    }
    
    // Obtener bookings para estas clases
    for (const cls of classes) {
      console.log(`\n─────────────────────────────────────`);
      console.log(`Clase ID: ${cls.id.substring(0, 20)}...`);
      console.log(`Instructor ID: ${cls.instructorId}`);
      console.log(`CourtId: ${cls.courtId || 'NULL (propuesta)'}`);
      console.log(`Nivel: ${cls.level}`);
      
      // Buscar bookings
      const bookings = await prisma.booking.findMany({
        where: {
          timeSlotId: cls.id,
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          user: { select: { name: true, email: true } }
        }
      });
      
      console.log(`Bookings: ${bookings.length}`);
      if (bookings.length > 0) {
        bookings.forEach(b => {
          console.log(`  - ${b.user.name} (${b.status}, grupo: ${b.groupSize})`);
        });
      }
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
