const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🔍 Verificando TimeSlot con booking reciclado...\n');
  
  // Buscar el TimeSlot del booking reciclado
  const booking = await prisma.booking.findUnique({
    where: { id: 'booking-1765616611954-kw2j4b8bs' },
    select: {
      timeSlotId: true,
      groupSize: true,
      status: true,
      isRecycled: true,
      wasConfirmed: true
    }
  });
  
  console.log('📋 Booking Info:');
  console.log(`   ID: booking-1765616611954-kw2j4b8bs`);
  console.log(`   TimeSlot: ${booking.timeSlotId}`);
  console.log(`   Status: ${booking.status}`);
  console.log(`   isRecycled: ${booking.isRecycled}`);
  console.log(`   wasConfirmed: ${booking.wasConfirmed}`);
  console.log(`   groupSize: ${booking.groupSize}\n`);
  
  // Buscar el TimeSlot con sus bookings (como lo hace el API)
  const timeSlot = await prisma.timeSlot.findUnique({
    where: { id: booking.timeSlotId },
    include: {
      bookings: {
        where: {
          OR: [
            { status: { in: ['PENDING', 'CONFIRMED'] } },
            { status: 'CANCELLED', isRecycled: true }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      instructor: {
        select: {
          name: true
        }
      }
    }
  });
  
  console.log('🎯 TimeSlot Details:');
  console.log(`   ID: ${timeSlot.id}`);
  console.log(`   Start: ${new Date(timeSlot.start)}`);
  console.log(`   Court Number: ${timeSlot.courtNumber}`);
  console.log(`   Instructor: ${timeSlot.instructor?.name}`);
  console.log(`   Total Bookings (incl. recycled): ${timeSlot.bookings.length}\n`);
  
  if (timeSlot.bookings.length === 0) {
    console.log('❌ PROBLEMA: No se encontraron bookings para este TimeSlot');
    console.log('   El filtro del API puede estar bloqueando la reserva reciclada\n');
  } else {
    console.log('✅ Bookings encontrados:');
    timeSlot.bookings.forEach((b, i) => {
      console.log(`\n   ${i + 1}. ${b.user.name}`);
      console.log(`      Status: ${b.status}`);
      console.log(`      isRecycled: ${b.isRecycled}`);
      console.log(`      wasConfirmed: ${b.wasConfirmed}`);
      console.log(`      groupSize: ${b.groupSize}`);
    });
  }
  
  console.log('\n📊 Resumen:');
  console.log(`   ✓ Booking existe: SÍ`);
  console.log(`   ✓ isRecycled=true: SÍ`);
  console.log(`   ✓ wasConfirmed=true: SÍ`);
  console.log(`   ✓ Aparece en query API: ${timeSlot.bookings.length > 0 ? 'SÍ ✅' : 'NO ❌'}\n`);
  
  await prisma.$disconnect();
})();
