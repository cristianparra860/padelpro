const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCreditsToAlex() {
  try {
    const user = await prisma.user.update({
      where: { email: 'alex.garcia@email.com' },
      data: { credits: 100 }
    });
    
    console.log(`✅ Créditos actualizados para ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Créditos: ${user.credits}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addCreditsToAlex();
