const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findFirst({
    where: { email: 'jugador2@padelpro.com' },
    select: { id: true, credits: true, blockedCredits: true }
  });
  
  console.log('Usuario:', user);
  
  const bookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: 'PENDING',
      timeSlot: {
        courtId: null // TimeSlot sin pista asignada
      }
    },
    select: {
      id: true,
      amountBlocked: true,
      groupSize: true,
      timeSlot: {
        select: {
          totalPrice: true,
          start: true,
          courtId: true
        }
      }
    },
    orderBy: { amountBlocked: 'desc' }
  });
  
  console.log('\nBookings PENDING sin pista:');
  bookings.forEach(b => {
    console.log(`  amountBlocked: ${b.amountBlocked}, groupSize: ${b.groupSize}, totalPrice: ${b.timeSlot.totalPrice}, start: ${new Date(b.timeSlot.start).toLocaleString()}`);
  });
  
  const maxAmount = bookings.length > 0 ? Math.max(...bookings.map(b => b.amountBlocked)) : 0;
  console.log('\n=== RESUMEN ===');
  console.log('Máximo amountBlocked:', maxAmount, '€');
  console.log('blockedCredits actual:', user.blockedCredits, '€');
  console.log('Debería ser:', maxAmount, '€');
  console.log('Diferencia:', Math.abs(user.blockedCredits - maxAmount), '€');
  
  // ACTUALIZAR el blockedCredits del usuario
  if (user.blockedCredits !== maxAmount) {
    console.log('\n🔧 Corrigiendo blockedCredits...');
    await prisma.user.update({
      where: { id: user.id },
      data: { blockedCredits: maxAmount }
    });
    console.log('✅ blockedCredits actualizado a:', maxAmount, '€');
  }
  
  await prisma.$disconnect();
})();
