const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== VERIFICAR ÚLTIMA CANCELACIÓN ===\n');
  
  // Buscar TimeSlots con courtId pero sin bookings ACTIVOS en las últimas horas
  const ahora = new Date();
  const hace2Horas = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);
  
  const slotsRecientes = await prisma.timeSlot.findMany({
    where: {
      courtId: {
        not: null
      },
      updatedAt: {
        gte: hace2Horas
      }
    },
    include: {
      bookings: true
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 10
  });
  
  console.log(`TimeSlots con courtId actualizados en las últimas 2 horas: ${slotsRecientes.length}\n`);
  
  slotsRecientes.forEach(slot => {
    const bookingsActivos = slot.bookings.filter(b => b.status !== 'CANCELLED').length;
    const bookingsCancelados = slot.bookings.filter(b => b.status === 'CANCELLED').length;
    
    console.log(`📍 TimeSlot: ${slot.id}`);
    console.log(`   Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
    console.log(`   Pista: ${slot.courtNumber}`);
    console.log(`   Updated: ${new Date(slot.updatedAt).toLocaleString('es-ES')}`);
    console.log(`   Bookings activos: ${bookingsActivos}`);
    console.log(`   Bookings cancelados: ${bookingsCancelados}`);
    
    if (bookingsActivos === 0 && bookingsCancelados > 0) {
      console.log(`   ⚠️ PROBLEMA: Tiene bookings cancelados pero courtId NO se limpió`);
    }
    console.log('');
  });
  
  // También buscar bookings cancelados recientemente
  console.log('\n=== BOOKINGS CANCELADOS RECIENTEMENTE ===\n');
  
  const bookingsCancelados = await prisma.booking.findMany({
    where: {
      status: 'CANCELLED',
      updatedAt: {
        gte: hace2Horas
      }
    },
    include: {
      timeSlot: {
        select: {
          id: true,
          start: true,
          courtNumber: true,
          courtId: true
        }
      },
      user: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 5
  });
  
  console.log(`Bookings cancelados en las últimas 2 horas: ${bookingsCancelados.length}\n`);
  
  bookingsCancelados.forEach(b => {
    console.log(`🚫 Booking ${b.id}`);
    console.log(`   Usuario: ${b.user.name}`);
    console.log(`   TimeSlot: ${b.timeSlot.id}`);
    console.log(`   Clase: ${new Date(b.timeSlot.start).toLocaleString('es-ES')}`);
    console.log(`   Pista del TimeSlot: ${b.timeSlot.courtNumber}`);
    console.log(`   CourtId del TimeSlot: ${b.timeSlot.courtId}`);
    console.log(`   Cancelado: ${new Date(b.updatedAt).toLocaleString('es-ES')}`);
    
    if (b.timeSlot.courtId !== null) {
      console.log(`   ⚠️ PROBLEMA: TimeSlot sigue con courtId asignado`);
    }
    console.log('');
  });
  
  await prisma.$disconnect();
}

main();
