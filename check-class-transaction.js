const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar la transacción de la clase pendiente
  const classTransaction = await prisma.transaction.findFirst({
    where: {
      userId: 'cmjmrxqpq000jtg8c7jmtlhps',
      concept: { contains: 'Clase' }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('📋 Transaction de clase:');
  console.log(JSON.stringify(classTransaction, null, 2));

  // Buscar todas las transacciones recientes
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId: 'cmjmrxqpq000jtg8c7jmtlhps' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('\n📋 Últimas 5 transacciones:');
  recentTransactions.forEach(tx => {
    console.log(`- ${tx.concept}: amount=${tx.amount}, action=${tx.action}, type=${tx.type}`);
  });

  await prisma.$disconnect();
}

main();
