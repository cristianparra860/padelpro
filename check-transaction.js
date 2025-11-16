const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransaction() {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: 'cmhkwi8so0001tggo0bwojrjy',
      type: 'points'
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  console.log('\n📊 Últimas transacciones de puntos:\n');
  transactions.forEach((t, i) => {
    console.log(`${i + 1}. ID: ${t.id}`);
    console.log(`   Tipo: ${t.type}`);
    console.log(`   Acción: ${t.action}`);
    console.log(`   Cantidad: ${t.amount}`);
    console.log(`   Saldo después: ${t.balance}`);
    console.log(`   Concepto: ${t.concept}`);
    console.log(`   Metadata: ${t.metadata || 'N/A'}`);
    console.log(`   Fecha: ${t.createdAt}\n`);
  });
  
  await prisma.$disconnect();
}

checkTransaction();
