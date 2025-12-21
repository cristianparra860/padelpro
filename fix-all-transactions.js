// Corregir transacciones antiguas de euros a céntimos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTransactions() {
  try {
    console.log('🔧 Corrigiendo transacciones antiguas...\n');
    
    // Obtener todas las transacciones con amount < 100
    const problematicTxs = await prisma.transaction.findMany({
      where: {
        amount: {
          gt: 0,
          lt: 100
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Encontradas ${problematicTxs.length} transacciones con amount < 100\n`);
    
    if (problematicTxs.length === 0) {
      console.log('✅ No hay transacciones que corregir');
      return;
    }
    
    // Corregir cada transacción
    let fixed = 0;
    for (const tx of problematicTxs) {
      const oldAmount = tx.amount;
      const newAmount = Math.round(oldAmount * 100);
      
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { amount: newAmount }
      });
      
      fixed++;
      
      if (fixed % 50 === 0) {
        console.log(`✅ Corregidas ${fixed}/${problematicTxs.length} transacciones...`);
      }
    }
    
    console.log(`\n✅ Total de transacciones corregidas: ${fixed}`);
    console.log('✅ Todas las transacciones ahora están en céntimos');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTransactions();
