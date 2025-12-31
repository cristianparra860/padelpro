const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Actualizando transacciones de match games para usar céntimos...');
  
  // Buscar transacciones de match games que tienen amount en euros (valores pequeños)
  const matchGameTransactions = await prisma.transaction.findMany({
    where: {
      relatedType: 'matchGameBooking',
      type: 'credit',
      amount: { lt: 100 } // Valores menores a 100 probablemente están en euros
    }
  });

  console.log(`📊 Found ${matchGameTransactions.length} match game transactions to update`);

  for (const tx of matchGameTransactions) {
    const newAmount = Math.round(tx.amount * 100); // Convertir euros a céntimos
    
    console.log(`  - Transaction ${tx.id}: ${tx.amount}€ → ${newAmount} céntimos`);
    
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { amount: newAmount }
    });
  }

  console.log('✅ Transacciones actualizadas correctamente');

  await prisma.$disconnect();
}

main().catch(console.error);
