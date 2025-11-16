const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTransactionDisplay() {
  const userId = 'cmhkwi8so0001tggo0bwojrjy';
  
  console.log('\n🔍 Verificando cómo se mostrarían las transacciones en cada diálogo\n');
  
  const allTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  const creditTransactions = allTransactions.filter(tx => tx.type === 'credit');
  const pointsTransactions = allTransactions.filter(tx => tx.type === 'points');
  
  console.log('📊 TODAS LAS TRANSACCIONES:', allTransactions.length);
  console.log('💶 Transacciones de CRÉDITO:', creditTransactions.length);
  console.log('🌟 Transacciones de PUNTOS:', pointsTransactions.length);
  console.log('\n' + '='.repeat(80));
  
  console.log('\n💶 DIÁLOGO "MOVIMIENTOS DE SALDO" - Solo créditos (€):\n');
  creditTransactions.forEach((tx, i) => {
    const isPositive = tx.action === 'add' || tx.action === 'refund' || tx.action === 'unblock';
    const amountInEuros = tx.amount / 100;
    const displayAmount = isPositive ? `+${amountInEuros.toFixed(2)}€` : `-${amountInEuros.toFixed(2)}€`;
    
    console.log(`${i + 1}. ${tx.concept}`);
    console.log(`   Monto: ${displayAmount}`);
    console.log(`   Balance: ${(tx.balance / 100).toFixed(2)}€`);
    console.log(`   Fecha: ${tx.createdAt.toLocaleString()}\n`);
  });
  
  console.log('='.repeat(80));
  console.log('\n🌟 DIÁLOGO "MOVIMIENTOS DE PUNTOS" - Solo puntos:\n');
  pointsTransactions.forEach((tx, i) => {
    console.log(`${i + 1}. ${tx.concept}`);
    console.log(`   Puntos: +${tx.amount}`);
    console.log(`   Balance: ${tx.balance} puntos`);
    console.log(`   Fecha: ${tx.createdAt.toLocaleString()}\n`);
  });
  
  await prisma.$disconnect();
}

testTransactionDisplay();
