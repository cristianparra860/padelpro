const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransactionStructure() {
  const tx = await prisma.transaction.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('Estructura de Transaction:');
  console.log(JSON.stringify(tx, null, 2));
  
  await prisma.$disconnect();
}

checkTransactionStructure();
