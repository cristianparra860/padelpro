const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { name: true } },
      timeSlot: { select: { start: true, courtNumber: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('\n=== ÚLTIMAS 5 RESERVAS (INCLUYENDO CANCELADAS) ===\n');
  
  if (bookings.length === 0) {
    console.log('No hay reservas en la base de datos');
  } else {
    bookings.forEach((b, i) => {
      const fecha = new Date(Number(b.timeSlot.start));
      console.log(`${i+1}. ${b.user.name}`);
      console.log(`   Status: ${b.status}`);
      console.log(`   Fecha: ${fecha.toLocaleString('es-ES')}`);
      console.log(`   Pista: ${b.timeSlot.courtNumber || 'Sin asignar'}`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
})();
