const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserBalance() {
  const user = await prisma.user.findUnique({
    where: { id: 'cmhkwi8so0001tggo0bwojrjy' },
    select: { 
      name: true, 
      credits: true, 
      blockedCredits: true 
    }
  });
  
  console.log('\n💰 Estado del Saldo de', user.name);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Créditos totales:', user.credits, `(€${(user.credits/100).toFixed(2)})`);
  console.log('Créditos bloqueados:', user.blockedCredits, `(€${(user.blockedCredits/100).toFixed(2)})`);
  console.log('Disponible:', user.credits - user.blockedCredits, `(€${((user.credits - user.blockedCredits)/100).toFixed(2)})`);
  
  // Verificar reservas pendientes
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: 'PENDING'
    },
    select: {
      id: true,
      amountBlocked: true,
      groupSize: true,
      timeSlot: {
        select: {
          start: true
        }
      }
    }
  });
  
  console.log('\n📚 Reservas PENDING:', pendingBookings.length);
  let totalBlocked = 0;
  pendingBookings.forEach((b, i) => {
    totalBlocked += b.amountBlocked;
    console.log(`${i+1}. €${(b.amountBlocked/100).toFixed(2)} - Grupo ${b.groupSize} - ${new Date(Number(b.timeSlot.start)).toLocaleString()}`);
  });
  
  console.log('\nTotal bloqueado calculado:', totalBlocked, `(€${(totalBlocked/100).toFixed(2)})`);
  console.log('Total en BD:', user.blockedCredits, `(€${(user.blockedCredits/100).toFixed(2)})`);
  
  if (totalBlocked !== user.blockedCredits) {
    console.log('\n⚠️ DESINCRONIZACIÓN DETECTADA');
    console.log('Diferencia:', totalBlocked - user.blockedCredits, `(€${((totalBlocked - user.blockedCredits)/100).toFixed(2)})`);
  } else {
    console.log('\n✅ Saldo bloqueado correcto');
  }
  
  await prisma.$disconnect();
}

checkUserBalance().catch(console.error);
