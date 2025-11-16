const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCancellations() {
  console.log('\n🔍 Verificando cancelaciones recientes...\n');
  
  // Buscar bookings cancelados
  const cancelledBookings = await prisma.booking.findMany({
    where: {
      userId: 'cmhkwi8so0001tggo0bwojrjy',
      status: 'CANCELLED'
    },
    include: {
      timeSlot: {
        select: {
          id: true,
          start: true,
          courtId: true,
          courtNumber: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  console.log(`📊 Total de reservas canceladas: ${cancelledBookings.length}\n`);

  cancelledBookings.forEach((booking, i) => {
    const ts = booking.timeSlot;
    const wasConfirmed = ts.courtNumber !== null;
    
    console.log(`${i + 1}. Booking: ${booking.id}`);
    console.log(`   Estado: ${booking.status}`);
    console.log(`   Fecha clase: ${new Date(ts.start).toLocaleString()}`);
    console.log(`   ¿Tenía pista asignada?: ${wasConfirmed ? `SÍ (Pista ${ts.courtNumber})` : 'NO (Pendiente)'}`);
    console.log(`   Monto bloqueado: ${booking.amountBlocked / 100}€`);
    console.log(`   ¿Debería dar puntos?: ${wasConfirmed ? 'SÍ ✅' : 'NO ❌'}`);
    console.log(`   Actualizado: ${booking.updatedAt.toLocaleString()}\n`);
  });

  await prisma.$disconnect();
}

checkCancellations();
