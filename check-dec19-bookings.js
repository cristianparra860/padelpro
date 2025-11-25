const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    console.log('🔍 Buscando clases del 19 de diciembre con bookings...\n');
    
    const startOfDay = new Date('2025-12-19T00:00:00.000Z').getTime();
    const endOfDay = new Date('2025-12-19T23:59:59.999Z').getTime();
    
    // Buscar slots con bookings
    const slots = await prisma.$queryRaw`
      SELECT DISTINCT ts.*
      FROM TimeSlot ts
      INNER JOIN Booking b ON b.timeSlotId = ts.id
      WHERE ts.start >= ${startOfDay}
      AND ts.start <= ${endOfDay}
      AND b.status != 'CANCELLED'
      ORDER BY ts.start
    `;
    
    console.log(`✅ Encontrados ${slots.length} slots con bookings activos\n`);
    
    for (const slot of slots) {
      const startDate = new Date(Number(slot.start));
      console.log('📍 TimeSlot:', {
        id: slot.id.substring(0, 12),
        hora: startDate.toLocaleTimeString('es-ES'),
        courtId: slot.courtId ? 'ASIGNADO' : 'PROPUESTA',
        instructorId: slot.instructorId?.substring(0, 12)
      });
      
      const bookings = await prisma.booking.findMany({
        where: { 
          timeSlotId: slot.id,
          status: { not: 'CANCELLED' }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log(`  📚 Bookings activos: ${bookings.length}`);
      bookings.forEach(b => {
        console.log(`    👤 ${b.user.name}: status=${b.status}, groupSize=${b.groupSize}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
