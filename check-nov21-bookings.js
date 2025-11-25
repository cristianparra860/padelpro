const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const bookings = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: {
          gte: new Date('2025-11-21T00:00:00Z'),
          lte: new Date('2025-11-21T23:59:59Z')
        }
      }
    },
    include: {
      user: { select: { name: true, email: true } },
      timeSlot: { select: { start: true, courtNumber: true } }
    }
  });
  
  console.log('\n📋 RESERVAS DEL 21 DE NOVIEMBRE:', bookings.length, '\n');
  
  bookings.forEach(b => {
    const hora = new Date(b.timeSlot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    console.log(`- ${b.user.name} (${b.user.email})`);
    console.log(`  Status: ${b.status} | Hora: ${hora} | Pista: ${b.timeSlot.courtNumber || 'Sin asignar'} | Grupo: ${b.groupSize}`);
    console.log('');
  });
  
  await prisma.$disconnect();
})();
