const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupTestBookings() {
  console.log('\n🧹 LIMPIEZA DE INSCRIPCIONES DE PRUEBA\n');

  // IDs de las inscripciones problemáticas
  const testBookingIds = [
    'test-booking-marc-1764954425082-2',
    'test-booking-marc-1764954425058-1'
  ];

  console.log('📋 Inscripciones a cancelar:');
  testBookingIds.forEach(id => console.log('  -', id));

  // Cancelar las inscripciones
  const result = await prisma.booking.updateMany({
    where: {
      id: {
        in: testBookingIds
      },
      status: 'PENDING'
    },
    data: {
      status: 'CANCELLED'
    }
  });

  console.log('\n✅ Inscripciones canceladas:', result.count);

  // Recalcular blockedCredits del usuario
  const userId = 'user-1763677035576-wv1t7iun0';
  
  console.log('\n🔄 Recalculando blockedCredits...');
  
  // Buscar todas las inscripciones PENDING restantes
  const remainingPending = await prisma.booking.findMany({
    where: {
      userId: userId,
      status: 'PENDING',
      timeSlot: {
        courtId: null
      }
    },
    select: {
      amountBlocked: true
    }
  });

  // Calcular el nuevo blocked (máximo de los amounts restantes)
  const amounts = remainingPending.map(b => b.amountBlocked || 0);
  const newBlockedCredits = amounts.length > 0 ? Math.max(...amounts) : 0;

  console.log('  Inscripciones PENDING restantes:', remainingPending.length);
  console.log('  Amounts restantes:', amounts.join('€, ') + '€');
  console.log('  Nuevo blockedCredits:', newBlockedCredits + '€');

  // Actualizar usuario
  await prisma.user.update({
    where: { id: userId },
    data: {
      blockedCredits: newBlockedCredits
    }
  });

  console.log('\n✅ Usuario actualizado!');

  // Verificar resultado final
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      blockedCredits: true
    }
  });

  console.log('\n💰 SALDO FINAL:');
  console.log('  Total credits:', user.credits + '€');
  console.log('  Blocked credits:', user.blockedCredits + '€');
  console.log('  Disponible:', (user.credits - user.blockedCredits) + '€');

  await prisma.$disconnect();
}

cleanupTestBookings().catch(console.error);
