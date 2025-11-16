const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingTransactions() {
  const txs = await prisma.transaction.findMany({
    where: {
      relatedId: 'booking-1762875992163-jbkvohdj2'
    }
  });

  console.log('\n📊 Transacciones para booking-1762875992163-jbkvohdj2:\n');
  
  if (txs.length === 0) {
    console.log('❌ No se encontraron transacciones para este booking\n');
  } else {
    txs.forEach(tx => {
      console.log(`ID: ${tx.id}`);
      console.log(`Tipo: ${tx.type}`);
      console.log(`Acción: ${tx.action}`);
      console.log(`Monto: ${tx.amount}`);
      console.log(`Balance: ${tx.balance}`);
      console.log(`Concepto: ${tx.concept}`);
      console.log(`Fecha: ${tx.createdAt}\n`);
    });
  }

  await prisma.$disconnect();
}

checkBookingTransactions();
