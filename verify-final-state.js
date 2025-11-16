const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFinal() {
  const booking = await prisma.booking.findUnique({
    where: { id: 'booking-1762445157072-txuz2i70n' },
    include: { timeSlot: true, user: true }
  });
  
  console.log('\n✅ ESTADO FINAL DE LA RESERVA:\n');
  console.log(`Usuario: ${booking.user.name}`);
  console.log(`Reserva ID: ${booking.id}`);
  console.log(`Estado: ${booking.status} ${booking.status === 'CONFIRMED' ? '✅' : '⏳'}`);
  console.log(`Monto: €${booking.amountBlocked/100}`);
  console.log(`\nClase:`);
  console.log(`  Hora: ${new Date(Number(booking.timeSlot.start)).toLocaleString()}`);
  console.log(`  Pista: ${booking.timeSlot.courtNumber || 'SIN ASIGNAR'} ${booking.timeSlot.courtNumber ? '✅' : '❌'}`);
  console.log(`  Categoría: ${booking.timeSlot.genderCategory || 'SIN CATEGORÍA'}`);
  console.log(`  Tamaño grupo: ${booking.groupSize} jugador(es)`);
  
  await prisma.$disconnect();
}

verifyFinal().catch(console.error);
