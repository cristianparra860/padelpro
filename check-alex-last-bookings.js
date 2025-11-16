const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlexBookings() {
  const bookings = await prisma.booking.findMany({
    where: { userId: 'cmhkwi8so0001tggo0bwojrjy' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { timeSlot: true }
  });
  
  console.log(`\n📚 Últimas ${bookings.length} reservas de Alex Garcia:\n`);
  
  bookings.forEach((b, i) => {
    const slotTime = b.timeSlot ? new Date(Number(b.timeSlot.start)).toLocaleString() : 'N/A';
    console.log(`${i+1}. Reserva ID: ${b.id}`);
    console.log(`   Creada: ${new Date(b.createdAt).toLocaleString()}`);
    console.log(`   TimeSlot: ${b.timeSlotId}`);
    console.log(`   Hora clase: ${slotTime}`);
    console.log(`   Pista: ${b.timeSlot?.courtNumber || 'SIN ASIGNAR'}`);
    console.log(`   Tamaño grupo: ${b.groupSize} jugador(es)`);
    console.log(`   Estado: ${b.status}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkAlexBookings().catch(console.error);
