const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnaBlockedCredits() {
  try {
    console.log('=== CHECKING ANA\'S BLOCKED CREDITS ===\n');
    
    const ana = await prisma.user.findUnique({
      where: { email: 'ana.nueva@padelpro.com' },
      select: {
        id: true,
        name: true,
        credits: true,
        blockedCredits: true,
        points: true,
        blockedPoints: true
      }
    });
    
    console.log('👤 Ana Nueva:');
    console.log(`   Total Credits: ${ana.credits}€`);
    console.log(`   Blocked Credits: ${ana.blockedCredits}€`);
    console.log(`   Available Credits: ${ana.credits - (ana.blockedCredits || 0)}€`);
    console.log(`   Total Points: ${ana.points} pts`);
    console.log(`   Blocked Points: ${ana.blockedPoints || 0} pts`);
    console.log(`   Available Points: ${ana.points - (ana.blockedPoints || 0)} pts\n`);
    
    const bookings = await prisma.booking.findMany({
      where: { userId: ana.id },
      select: {
        id: true,
        status: true,
        amountBlocked: true,
        paidWithPoints: true,
        pointsUsed: true,
        groupSize: true,
        createdAt: true,
        timeSlot: {
          select: {
            start: true,
            courtId: true,
            genderCategory: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    console.log(`📋 Total Bookings: ${bookings.length}\n`);
    
    // Agrupar por estado
    const byStatus = {
      PENDING: [],
      CONFIRMED: [],
      CANCELLED: [],
      COMPLETED: []
    };
    
    bookings.forEach(b => {
      if (byStatus[b.status]) {
        byStatus[b.status].push(b);
      }
    });
    
    console.log(`🟡 PENDING (${byStatus.PENDING.length}):`);
    byStatus.PENDING.forEach(b => {
      const date = new Date(Number(b.timeSlot.start));
      const payment = b.paidWithPoints ? `${b.pointsUsed} pts` : `${b.amountBlocked}€`;
      console.log(`   - ${date.toLocaleString('es-ES')} | ${payment} | Court: ${b.timeSlot.courtId || 'NULL'} | GroupSize: ${b.groupSize}`);
    });
    
    console.log(`\n🟢 CONFIRMED (${byStatus.CONFIRMED.length}):`);
    byStatus.CONFIRMED.forEach(b => {
      const date = new Date(Number(b.timeSlot.start));
      const payment = b.paidWithPoints ? `${b.pointsUsed} pts` : `${b.amountBlocked}€`;
      console.log(`   - ${date.toLocaleString('es-ES')} | ${payment} | Court: ${b.timeSlot.courtId || 'NULL'}`);
    });
    
    console.log(`\n⚫ CANCELLED (${byStatus.CANCELLED.length}):`);
    byStatus.CANCELLED.forEach(b => {
      const date = new Date(Number(b.timeSlot.start));
      const payment = b.paidWithPoints ? `${b.pointsUsed} pts` : `${b.amountBlocked}€`;
      console.log(`   - ${date.toLocaleString('es-ES')} | ${payment}`);
    });
    
    console.log(`\n✅ COMPLETED (${byStatus.COMPLETED.length}):`);
    byStatus.COMPLETED.forEach(b => {
      const date = new Date(Number(b.timeSlot.start));
      const payment = b.paidWithPoints ? `${b.pointsUsed} pts` : `${b.amountBlocked}€`;
      console.log(`   - ${date.toLocaleString('es-ES')} | ${payment}`);
    });
    
    // Calcular saldo bloqueado esperado
    console.log('\n💰 CALCULATION CHECK:');
    const expectedBlockedCredits = byStatus.PENDING.reduce((sum, b) => {
      return b.paidWithPoints ? sum : sum + (b.amountBlocked || 0);
    }, 0);
    
    const expectedBlockedPoints = byStatus.PENDING.reduce((sum, b) => {
      return b.paidWithPoints ? sum + (b.pointsUsed || 0) : sum;
    }, 0);
    
    console.log(`   Expected Blocked Credits: ${expectedBlockedCredits}€`);
    console.log(`   Actual Blocked Credits: ${ana.blockedCredits}€`);
    console.log(`   Match: ${expectedBlockedCredits === ana.blockedCredits ? '✅' : '❌'}`);
    
    console.log(`   Expected Blocked Points: ${expectedBlockedPoints} pts`);
    console.log(`   Actual Blocked Points: ${ana.blockedPoints || 0} pts`);
    console.log(`   Match: ${expectedBlockedPoints === (ana.blockedPoints || 0) ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnaBlockedCredits();
