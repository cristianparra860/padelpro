const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBalance() {
  const user = await prisma.user.findUnique({
    where: { email: 'jugador1@padelpro.com' },
    select: { credits: true, points: true, name: true }
  });
  
  console.log('👤 Usuario:', user.name);
  console.log('💰 Saldo:', user.credits, '€');
  console.log('🏆 Puntos:', user.points, 'pts');
  
  await prisma.$disconnect();
}

checkBalance();
