const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inicio = new Date('2025-11-16T00:00:00Z');
  const fin = new Date('2025-11-16T23:59:59Z');
  
  console.log('\n=== TIME SLOTS PARA DÍA 16 NOVIEMBRE ===\n');
  
  const timeSlots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: inicio,
        lte: fin
      }
    },
    include: {
      bookings: {
        where: {
          status: {
            not: 'CANCELLED'
          }
        }
      },
      instructor: true
    },
    orderBy: {
      start: 'asc'
    }
  });
  
  console.log('Total TimeSlots para el día 16:', timeSlots.length);
  console.log('\nDetalle:\n');
  
  timeSlots.forEach(ts => {
    const hora = new Date(ts.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const bookingsActivos = ts.bookings.length;
    
    console.log(`⏰ ${hora} - ${ts.instructor?.name || 'Sin instructor'}`);
    console.log(`   TimeSlot ID: ${ts.id}`);
    console.log(`   Court asignado: ${ts.courtNumber || 'No asignado (propuesta)'}`);
    console.log(`   Bookings activos: ${bookingsActivos}`);
    if (bookingsActivos > 0) {
      ts.bookings.forEach(b => {
        console.log(`      - Booking: ${b.userId}, Status: ${b.status}, GroupSize: ${b.groupSize}`);
      });
    }
    console.log('');
  });
  
  const totalBookings = timeSlots.reduce((sum, ts) => sum + ts.bookings.length, 0);
  console.log(`\n📊 RESUMEN:`);
  console.log(`   TimeSlots totales: ${timeSlots.length}`);
  console.log(`   Bookings activos: ${totalBookings}`);
  console.log(`   TimeSlots sin bookings: ${timeSlots.filter(ts => ts.bookings.length === 0).length}`);
  
  await prisma.$disconnect();
}

main();
