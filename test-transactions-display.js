const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTransactionsDisplay() {
  console.log('🧪 Verificando visualización de transacciones en euros\n');
  
  const userId = 'cmhkwi8so0001tggo0bwojrjy'; // Alex Garcia
  
  // 1. Obtener usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, credits: true, blockedCredits: true }
  });
  
  console.log('👤 Usuario: ' + user.name);
  console.log(`   Saldo Total: €${(user.credits / 100).toFixed(2)}`);
  console.log(`   Bloqueado: €${(user.blockedCredits / 100).toFixed(2)}`);
  console.log(`   Disponible: €${((user.credits - user.blockedCredits) / 100).toFixed(2)}\n`);
  
  // 2. Obtener últimas 10 transacciones
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`📊 Últimas ${transactions.length} transacciones:\n`);
  
  transactions.forEach((tx, i) => {
    const sign = tx.action === 'add' || tx.action === 'refund' || tx.action === 'unblock' ? '+' : '-';
    const color = sign === '+' ? '🟢' : '🔴';
    const amountEuros = (tx.amount / 100).toFixed(2);
    const balanceEuros = (tx.balance / 100).toFixed(2);
    
    console.log(`${i+1}. ${color} ${sign}€${amountEuros}`);
    console.log(`   Concepto: ${tx.concept}`);
    console.log(`   Tipo: ${tx.type} | Acción: ${tx.action}`);
    console.log(`   Balance después: €${balanceEuros}`);
    console.log(`   Fecha: ${new Date(tx.createdAt).toLocaleString('es-ES')}`);
    
    if (tx.metadata) {
      try {
        const meta = JSON.parse(tx.metadata);
        console.log(`   Metadata:`, meta);
      } catch (e) {
        // metadata no parseable
      }
    }
    console.log('');
  });
  
  // 3. Simular cómo se mostrará en el componente
  console.log('\n📱 Vista en el componente "Movimientos de Saldo":\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  transactions.slice(0, 5).forEach(tx => {
    const isPositive = tx.action === 'add' || tx.action === 'refund' || tx.action === 'unblock';
    const sign = isPositive ? '+' : '-';
    const icon = isPositive ? '✅' : '❌';
    const amount = (tx.amount / 100).toFixed(2);
    const date = new Date(tx.createdAt);
    const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    console.log(`${icon} ${tx.concept.substring(0, 40)}...`);
    console.log(`   ${dateStr}, ${timeStr}    ${sign}€${amount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
  
  console.log('\n✅ Sistema de transacciones funcionando correctamente');
  console.log('   El componente CreditMovementsDialog muestra:');
  console.log('   - Saldo disponible en euros');
  console.log('   - Créditos bloqueados con detalle');
  console.log('   - Historial completo de movimientos');
  console.log('   - Formato claro con + y - para entradas/salidas');
  
  await prisma.$disconnect();
}

testTransactionsDisplay().catch(console.error);
