const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreBalance() {
  try {
    // Restaurar a 109814 céntimos (€1098.14) y 0 puntos
    const user = await prisma.user.update({
      where: { id: 'alex-user-id' },
      data: {
        credits: 109814,
        points: 0
      },
      select: { id: true, name: true, credits: true, points: true }
    });

    console.log('✅ Saldo restaurado:');
    console.log(`   Usuario: ${user.name}`);
    console.log(`   Saldo: €${(user.credits / 100).toFixed(2)}`);
    console.log(`   Puntos: ${user.points}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreBalance();
