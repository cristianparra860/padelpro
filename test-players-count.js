const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPlayersCount() {
  console.log('=== VERIFICANDO CÁLCULO DE JUGADORES ===\n');
  
  // Ejemplo: 17 Dic 20:00 - Ana Lopez
  const slot = await prisma.timeSlot.findFirst({
    where: {
      start: new Date('2025-12-17T20:00:00.000Z')
    },
    include: {
      bookings: {
        select: { groupSize: true, status: true, userId: true }
      },
      instructor: { select: { name: true } }
    }
  });
  
  if (!slot) {
    console.log('No encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`Clase: 17 Dic 20:00 - ${slot.instructor?.name}`);
  console.log(`Total bookings: ${slot.bookings.length}\n`);
  
  slot.bookings.forEach((b, i) => {
    console.log(`Booking ${i+1}:`);
    console.log(`  groupSize: ${b.groupSize}`);
    console.log(`  status: ${b.status}`);
    console.log('');
  });
  
  // Cálculo correcto (solo CONFIRMED y PENDING)
  const activeBookings = slot.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
  const totalPlayers = activeBookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
  
  console.log(`Bookings activos: ${activeBookings.length}`);
  console.log(`Total jugadores: ${totalPlayers}`);
  console.log('\n Este valor debería mostrarse en el calendario');
  
  await prisma.$disconnect();
}

testPlayersCount();
