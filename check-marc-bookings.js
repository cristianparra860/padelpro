const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcBookings() {
  const userId = 'user-1763677035576-wv1t7iun0';
  
  console.log('🔍 Buscando bookings de Marc Parra (jugador1@padelpro.com)...\n');
  
  const bookings = await prisma.booking.findMany({
    where: {
      userId: userId
    },
    include: {
      timeSlot: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  console.log(`📋 Total bookings: ${bookings.length}\n`);
  
  if (bookings.length === 0) {
    console.log('❌ NO HAY BOOKINGS para este usuario');
    console.log('\nEsto confirma que cuando intentas reservar, NO se está creando el booking.');
    console.log('El problema está en el endpoint de reserva.\n');
  } else {
    bookings.forEach(b => {
      const date = new Date(b.timeSlot.start);
      console.log(`${date.toLocaleDateString()} ${date.toLocaleTimeString()} - Status: ${b.status}`);
      console.log(`   Booking ID: ${b.id.substring(0, 25)}...`);
      console.log(`   TimeSlot ID: ${b.timeSlotId.substring(0, 25)}...`);
      console.log(`   GroupSize: ${b.groupSize}, Pista: ${b.timeSlot.courtNumber || 'Pendiente'}`);
      console.log('');
    });
  }
  
  // Verificar datos del usuario
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  console.log('\n👤 Datos del usuario:');
  console.log(`   Nombre: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Credits: ${user.credits}`);
  console.log(`   Level: ${user.level}`);
  console.log(`   Gender: ${user.genderCategory}`);
  
  await prisma.$disconnect();
}

checkMarcBookings();
