const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    console.log('🔍 Buscando clases del 22 de diciembre a las 9:30h...\n');
    
    // Fecha 22 dic 2025 09:30 UTC
    const targetDate = new Date('2025-12-22T09:30:00.000Z');
    const startTimestamp = targetDate.getTime();
    
    console.log('📅 Buscando timestamp:', startTimestamp);
    console.log('📅 Fecha ISO:', targetDate.toISOString());
    
    // Buscar el TimeSlot
    const slots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE start = ${startTimestamp}
      OR start = ${targetDate.toISOString()}
    `;
    
    console.log(`\n✅ Encontrados ${slots.length} slots\n`);
    
    for (const slot of slots) {
      console.log('📍 TimeSlot:', {
        id: slot.id.substring(0, 12),
        start: new Date(slot.start).toISOString(),
        instructorId: slot.instructorId?.substring(0, 12),
        courtId: slot.courtId ? slot.courtId.substring(0, 12) : null
      });
      
      // Buscar bookings de este slot
      const bookings = await prisma.booking.findMany({
        where: { timeSlotId: slot.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log(`\n  📚 Bookings encontrados: ${bookings.length}`);
      
      for (const booking of bookings) {
        console.log(`    👤 ${booking.user.name}:`, {
          bookingId: booking.id.substring(0, 12),
          status: booking.status,
          groupSize: booking.groupSize,
          email: booking.user.email
        });
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
