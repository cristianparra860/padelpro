// Verificar transacciones de Marc Parra
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcTransactions() {
  try {
    console.log('📊 Verificando transacciones de Marc Parra...\n');
    
    // Buscar a Marc Parra
    const marc = await prisma.user.findFirst({
      where: {
        email: 'jugador1@padelpro.com'
      }
    });
    
    if (!marc) {
      console.log('❌ Marc Parra no encontrado');
      return;
    }
    
    console.log(`👤 Usuario: ${marc.name} (${marc.email})`);
    console.log(`   ID: ${marc.id}`);
    console.log(`   💳 Credits: ${marc.credits} céntimos (€${(marc.credits/100).toFixed(2)})`);
    console.log(`   🔒 Blocked: ${marc.blockedCredits} céntimos (€${(marc.blockedCredits/100).toFixed(2)})\n`);
    
    // Obtener todas las transacciones
    const transactions = await prisma.transaction.findMany({
      where: { userId: marc.id },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📋 Total transacciones: ${transactions.length}\n`);
    
    if (transactions.length === 0) {
      console.log('❌ No hay transacciones para este usuario');
      return;
    }
    
    // Mostrar las últimas 20 transacciones
    console.log('🔍 Últimas 20 transacciones:\n');
    
    transactions.slice(0, 20).forEach((tx, idx) => {
      const date = new Date(tx.createdAt).toLocaleString('es-ES');
      console.log(`[${idx + 1}] ${date}`);
      console.log(`    Type: ${tx.type} | Action: ${tx.action}`);
      console.log(`    Amount: ${tx.amount} ${tx.amount < 100 && tx.amount > 0 ? '⚠️ (posible euros)' : '(céntimos)'} → €${(tx.amount/100).toFixed(2)}`);
      console.log(`    Balance: ${tx.balance} céntimos → €${(tx.balance/100).toFixed(2)}`);
      console.log(`    Concept: ${tx.concept}`);
      console.log(`    Related: ${tx.relatedType || 'N/A'} | ${tx.relatedId || 'N/A'}`);
      console.log('');
    });
    
    // Análisis de problemas
    console.log('\n📊 ANÁLISIS:\n');
    
    const problematicTxs = transactions.filter(tx => tx.amount > 0 && tx.amount < 100);
    if (problematicTxs.length > 0) {
      console.log(`⚠️ ${problematicTxs.length} transacciones con amount < 100 (posiblemente en euros):`);
      problematicTxs.forEach(tx => {
        console.log(`   - ID: ${tx.id} | Amount: ${tx.amount} | Type: ${tx.type} | Action: ${tx.action} | Date: ${new Date(tx.createdAt).toLocaleDateString('es-ES')}`);
      });
    } else {
      console.log('✅ Todas las transacciones tienen amount >= 100 (formato correcto en céntimos)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarcTransactions();
