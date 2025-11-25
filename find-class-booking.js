const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findClassWithBooking() {
  // Buscar cualquier clase con bookings
  const slot = await prisma.timeSlot.findFirst({
    where: {
      bookings: { some: { status: 'PENDING' } },
      start: { gte: new Date('2025-12-17T00:00:00.000Z') }
    },
    include: {
      bookings: true,
      instructor: { select: { name: true } }
    }
  });
  
  if (!slot) {
    console.log('No hay clases con bookings en dic 17');
    await prisma.$disconnect();
    return;
  }
  
  const date = new Date(slot.start);
  const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
  
  console.log(`Clase: ${hourLocal} - ${slot.instructor?.name}`);
  console.log(`Total bookings: ${slot.bookings.length}\n`);
  
  slot.bookings.forEach((b, i) => {
    console.log(`Booking ${i+1}:`);
    console.log(`  groupSize: ${b.groupSize}`);
    console.log(`  status: ${b.status}`);
  });
  
  // Cálculo INCORRECTO (todos los bookings)
  const totalAll = slot.bookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
  
  // Cálculo CORRECTO (solo activos)
  const activeBookings = slot.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
  const totalActive = activeBookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
  
  console.log(`\n INCORRECTO (todos): ${totalAll} jugadores`);
  console.log(` CORRECTO (solo activos): ${totalActive} jugadores`);
  console.log(`\nEl API ya filtra correctamente, debería mostrar: ${totalActive}`);
  
  await prisma.$disconnect();
}

findClassWithBooking();
