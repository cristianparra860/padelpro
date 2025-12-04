const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBalance() {
  const user = await prisma.user.findFirst({
    where: { email: 'jugador2@padelpro.com' },
    select: {
      name: true,
      credits: true,
      blockedCredits: true,
      points: true
    }
  });
  
  console.log('👤 Usuario:', user.name);
  console.log('💰 Credits (euros):', user.credits);
  console.log('🔒 Blocked credits:', user.blockedCredits);
  console.log('💎 Points:', user.points);
  console.log('✅ Available credits:', user.credits - user.blockedCredits);
  
  await prisma.$disconnect();
}

checkBalance();
