const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPointsTransactions() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });
    
    if (!user) {
      console.log('Usuario no encontrado');
      return;
    }
    
    console.log('🔍 Transacciones de PUNTOS del usuario:\n');
    
    const pointsTxs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'points'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`Total de transacciones de puntos: ${pointsTxs.length}\n`);
    
    pointsTxs.forEach((tx, i) => {
      const date = new Date(tx.createdAt);
      console.log(`${i + 1}. ${tx.action} - ${tx.amount} puntos`);
      console.log(`   Concepto: ${tx.concept}`);
      console.log(`   Balance: ${tx.balance} puntos`);
      console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
      console.log('');
    });
    
    console.log('\n🔍 Transacciones de CRÉDITO recientes:\n');
    
    const creditTxs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'credit'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    creditTxs.forEach((tx, i) => {
      const date = new Date(tx.createdAt);
      console.log(`${i + 1}. ${tx.action} - ${tx.amount} céntimos (${tx.amount/100}€)`);
      console.log(`   Concepto: ${tx.concept}`);
      console.log(`   Fecha: ${date.toLocaleString('es-ES')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPointsTransactions();
