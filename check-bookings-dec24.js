const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    // Buscar clases del 24 de diciembre con bookings
    const startDate = new Date('2025-12-24T00:00:00.000Z');
    const endDate = new Date('2025-12-24T23:59:59.999Z');
    
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        bookings: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          }
        }
      }
    });
    
    console.log(`\n📊 Total de clases el 24 de diciembre: ${slots.length}`);
    
    const slotsWithBookings = slots.filter(s => s.bookings.length > 0);
    console.log(`📚 Clases CON bookings activos: ${slotsWithBookings.length}`);
    
    const slotsEmpty = slots.filter(s => s.bookings.length === 0);
    console.log(`⭕ Clases SIN bookings: ${slotsEmpty.length}\n`);
    
    if (slotsWithBookings.length > 0) {
      console.log('📝 Clases con bookings:');
      slotsWithBookings.forEach(slot => {
        const time = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`  - ${time}: ${slot.bookings.length} bookings (courtNumber: ${slot.courtNumber || 'NULL'})`);
        slot.bookings.forEach(b => {
          console.log(`    → groupSize: ${b.groupSize}, status: ${b.status}`);
        });
      });
    } else {
      console.log('❌ NO hay ninguna clase con bookings activos para el 24 de diciembre');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
