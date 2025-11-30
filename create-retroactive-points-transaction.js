const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRetroactiveTransaction() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'jugador1@padelpro.com' },
      select: { id: true, name: true, points: true }
    });

    console.log('👤 Usuario:', user);
    console.log('📊 Puntos actuales:', user.points);

    // Crear transacción retroactiva para los 10 puntos existentes
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'points',
        action: 'add',
        amount: 10,
        balance: user.points,
        concept: 'Conversión de 10€ a puntos',
        relatedType: 'conversion',
        metadata: JSON.stringify({
          convertedEuros: 10,
          pointsReceived: 10,
          exchangeRate: 1,
          retroactive: true,
          note: 'Transacción retroactiva creada para registrar conversión anterior'
        }),
        createdAt: new Date()
      }
    });

    console.log('✅ Transacción retroactiva creada:', transaction.id);
    console.log('📝 Detalles:', {
      type: transaction.type,
      action: transaction.action,
      amount: transaction.amount,
      balance: transaction.balance,
      concept: transaction.concept
    });

    // Verificar todas las transacciones de puntos
    const allPointsTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'points'
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n📋 Transacciones de puntos totales:', allPointsTransactions.length);
    allPointsTransactions.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.concept} - ${tx.amount} pts - ${tx.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRetroactiveTransaction();
