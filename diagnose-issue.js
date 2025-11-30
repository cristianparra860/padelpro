const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const userId = 'user-1763677035576-wv1t7iun0';
    
    console.log('=== BOOKINGS RECIENTES ===');
    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { timeSlot: true }
    });
    
    bookings.forEach((b, i) => {
      console.log(`${i + 1}. ${b.id}`);
      console.log(`   Status: ${b.status}`);
      console.log(`   Amount: €${b.amountBlocked}`);
      console.log(`   isRecycled: ${b.isRecycled}`);
      console.log(`   Created: ${b.createdAt.toLocaleString()}`);
      console.log('');
    });

    console.log('\n=== TRANSACCIONES RECIENTES (últimas 15) ===');
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 15
    });
    
    transactions.forEach((t, i) => {
      console.log(`${i + 1}. [${t.type}] ${t.action} - ${t.concept}`);
      console.log(`   Amount: ${t.amount} | Balance: ${t.balance}`);
      console.log(`   Time: ${t.createdAt.toLocaleTimeString()}`);
      console.log('');
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, points: true, blockedCredits: true }
    });

    console.log('\n=== SALDO ACTUAL ===');
    console.log(`Créditos: €${user.credits}`);
    console.log(`Bloqueados: €${user.blockedCredits}`);
    console.log(`Disponibles: €${user.credits - user.blockedCredits}`);
    console.log(`Puntos: ${user.points}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
