const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPointsTransactions() {
  try {
    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { email: 'jugador1@padelpro.com' },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        points: true,
        blockedCredits: true
      }
    });

    console.log('👤 Usuario:', user);
    console.log('\n--- TRANSACCIONES DE CRÉDITOS (type=credit) ---');
    
    const creditTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'credit'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Encontradas ${creditTransactions.length} transacciones de crédito:`);
    creditTransactions.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.action} - ${tx.concept} - €${tx.amount} - Balance: €${tx.balance} - ${tx.createdAt}`);
    });

    console.log('\n--- TRANSACCIONES DE PUNTOS (type=points) ---');
    
    const pointsTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'points'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Encontradas ${pointsTransactions.length} transacciones de puntos:`);
    if (pointsTransactions.length === 0) {
      console.log('⚠️  NO HAY TRANSACCIONES DE PUNTOS REGISTRADAS');
    } else {
      pointsTransactions.forEach((tx, i) => {
        console.log(`${i + 1}. ${tx.action} - ${tx.concept} - ${tx.amount} pts - Balance: ${tx.balance} pts - ${tx.createdAt}`);
      });
    }

    console.log('\n--- TODAS LAS TRANSACCIONES (sin filtro) ---');
    const allTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    console.log(`Total de transacciones: ${allTransactions.length}`);
    allTransactions.forEach((tx, i) => {
      console.log(`${i + 1}. [${tx.type}] ${tx.action} - ${tx.concept} - ${tx.amount} - ${tx.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPointsTransactions();
