const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    console.log('🔍 Buscando TODAS las clases del 22 de diciembre 2025...\n');
    
    // Rango del día 22 dic 2025
    const startOfDay = new Date('2025-12-22T00:00:00.000Z').getTime();
    const endOfDay = new Date('2025-12-22T23:59:59.999Z').getTime();
    
    console.log('📅 Rango:', startOfDay, '-', endOfDay);
    
    // Buscar todos los TimeSlots del día
    const slots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE start >= ${startOfDay}
      AND start <= ${endOfDay}
      ORDER BY start
    `;
    
    console.log(`\n✅ Encontrados ${slots.length} slots el 22 de diciembre\n`);
    
    for (const slot of slots) {
      const startDate = new Date(Number(slot.start));
      console.log('📍 TimeSlot:', {
        id: slot.id.substring(0, 12),
        start: startDate.toISOString(),
        hora: startDate.toLocaleTimeString('es-ES'),
        instructorId: slot.instructorId?.substring(0, 12),
        courtId: slot.courtId ? slot.courtId.substring(0, 12) : 'SIN ASIGNAR'
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
      
      console.log(`  📚 Bookings: ${bookings.length}`);
      
      for (const booking of bookings) {
        console.log(`    👤 ${booking.user.name}:`, {
          status: booking.status,
          groupSize: booking.groupSize
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
