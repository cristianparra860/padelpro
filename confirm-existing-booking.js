const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function confirmExistingBooking() {
  const bookingId = 'booking-1762445157072-txuz2i70n';
  const timeSlotId = 'cmhkwtlu5002ttg7g3xfrr1a8';
  
  console.log('🔧 Confirmando reserva existente manualmente\n');
  
  // 1. Obtener info de la reserva
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, timeSlot: true }
  });
  
  console.log('📚 Reserva:');
  console.log(`   ID: ${booking.id}`);
  console.log(`   Usuario: ${booking.user.name}`);
  console.log(`   Monto bloqueado: €${booking.amountBlocked/100}`);
  console.log(`   Estado actual: ${booking.status}`);
  console.log(`   TimeSlot: ${booking.timeSlotId}`);
  console.log(`   Pista: ${booking.timeSlot.courtNumber || 'SIN ASIGNAR'}\n`);
  
  if (booking.status === 'CONFIRMED') {
    console.log('✅ La reserva ya está confirmada');
    await prisma.$disconnect();
    return;
  }
  
  // 2. Obtener balance actual del usuario
  console.log('💰 Balance del usuario:');
  console.log(`   Créditos: €${booking.user.credits/100}`);
  console.log(`   Bloqueados: €${booking.user.blockedCredits/100}\n`);
  
  const amountToCharge = booking.amountBlocked;
  
  // 3. Cobrar del saldo real
  console.log('3️⃣ Cobrando del saldo real...');
  await prisma.$executeRaw`
    UPDATE User 
    SET credits = credits - ${amountToCharge}, updatedAt = datetime('now')
    WHERE id = ${booking.userId}
  `;
  console.log(`   ✅ Cobrados €${amountToCharge/100}\n`);
  
  // 4. Confirmar reserva
  console.log('4️⃣ Confirmando reserva...');
  await prisma.$executeRaw`
    UPDATE Booking 
    SET status = 'CONFIRMED', updatedAt = datetime('now')
    WHERE id = ${bookingId}
  `;
  console.log(`   ✅ Reserva confirmada\n`);
  
  // 5. Recalcular créditos bloqueados
  console.log('5️⃣ Recalculando créditos bloqueados...');
  const pendingBookings = await prisma.booking.aggregate({
    where: {
      userId: booking.userId,
      status: 'PENDING'
    },
    _sum: {
      amountBlocked: true
    }
  });
  
  const newBlockedAmount = pendingBookings._sum.amountBlocked || 0;
  
  await prisma.user.update({
    where: { id: booking.userId },
    data: { blockedCredits: newBlockedAmount }
  });
  
  console.log(`   ✅ Nuevos créditos bloqueados: €${newBlockedAmount/100}\n`);
  
  // 6. Verificar resultado final
  console.log('6️⃣ Estado final:');
  const updatedUser = await prisma.user.findUnique({
    where: { id: booking.userId },
    select: { credits: true, blockedCredits: true }
  });
  
  const updatedBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true }
  });
  
  console.log(`   Usuario:`);
  console.log(`   - Créditos: €${updatedUser.credits/100}`);
  console.log(`   - Bloqueados: €${updatedUser.blockedCredits/100}`);
  console.log(`   Reserva:`);
  console.log(`   - Estado: ${updatedBooking.status}`);
  
  if (updatedBooking.status === 'CONFIRMED') {
    console.log('\n✅ ¡Reserva confirmada exitosamente!');
  }
  
  await prisma.$disconnect();
}

confirmExistingBooking().catch(console.error);
