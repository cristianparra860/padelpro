const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGhostBooking() {
  const bookingId = 'booking-1764007539235-ar37psi15';
  
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      timeSlot: {
        include: { instructor: true }
      }
    }
  });
  
  console.log('🔍 RESERVA FANTASMA:\n');
  console.log('Booking ID:', booking.id);
  console.log('User ID en booking:', booking.userId);
  console.log('Usuario vinculado:', booking.user?.name, booking.user?.email);
  console.log('Estado:', booking.status);
  console.log('Grupo:', booking.groupSize);
  console.log('');
  
  // Usuario real de Marc
  const marcReal = await prisma.user.findFirst({
    where: { email: 'jugador1@padelpro.com' }
  });
  
  console.log('👤 USUARIO REAL Marc Parra:');
  console.log('ID:', marcReal.id);
  console.log('Nombre:', marcReal.name);
  console.log('Email:', marcReal.email);
  console.log('');
  
  console.log('🎯 PROBLEMA:');
  if (booking.userId === marcReal.id) {
    console.log('✅ Los IDs coinciden - NO es reserva fantasma');
  } else {
    console.log('❌ LOS IDs NO COINCIDEN');
    console.log(`   Booking apunta a: ${booking.userId}`);
    console.log(`   Marc real es: ${marcReal.id}`);
    console.log('');
    console.log('💡 CAUSA: Hay DOS usuarios "Marc Parra" con IDs diferentes');
  }
  
  await prisma.$disconnect();
}

checkGhostBooking();
