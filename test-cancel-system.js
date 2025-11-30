const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancellation() {
  try {
    const userId = 'user-1763677035576-wv1t7iun0';
    
    // 1. Encontrar el booking CONFIRMED que acabamos de crear
    console.log('🔍 Buscando booking CONFIRMED...');
    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        status: 'CONFIRMED'
      },
      include: {
        timeSlot: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!booking) {
      console.log('❌ No se encontró ningún booking CONFIRMED');
      return;
    }

    console.log('✅ Booking encontrado:');
    console.log(`   ID: ${booking.id}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Amount: €${booking.amountBlocked}`);
    console.log(`   TimeSlot: ${new Date(booking.timeSlot.start).toLocaleString()}`);

    // 2. Obtener estado actual del usuario
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, points: true, name: true }
    });

    console.log('\n💰 ESTADO ANTES DE CANCELAR:');
    console.log(`   Créditos: €${userBefore.credits}`);
    console.log(`   Puntos: ${userBefore.points}`);

    // 3. Simular la cancelación llamando al endpoint
    console.log('\n🚀 Llamando a /api/classes/cancel...');
    
    const response = await fetch('http://localhost:9002/api/classes/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: booking.id,
        userId: userId,
        timeSlotId: booking.timeSlotId
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error en la API:', result);
      return;
    }

    console.log('✅ Respuesta de la API:', result);

    // 4. Verificar estado después
    const userAfter = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, points: true }
    });

    console.log('\n💰 ESTADO DESPUÉS DE CANCELAR:');
    console.log(`   Créditos: €${userAfter.credits}`);
    console.log(`   Puntos: ${userAfter.points}`);

    const creditChange = userAfter.credits - userBefore.credits;
    const pointsChange = userAfter.points - userBefore.points;

    console.log('\n📊 CAMBIOS:');
    console.log(`   Créditos: ${creditChange > 0 ? '+' : ''}€${creditChange}`);
    console.log(`   Puntos: ${pointsChange > 0 ? '+' : ''}${pointsChange}`);

    // 5. Verificar transacciones
    console.log('\n📝 TRANSACCIONES RECIENTES:');
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    transactions.forEach((tx, i) => {
      console.log(`${i + 1}. [${tx.type}] ${tx.action} - ${tx.concept}`);
      console.log(`   Amount: ${tx.amount} | Balance: ${tx.balance}`);
    });

    // 6. Verificación final
    console.log('\n🎯 RESULTADO:');
    if (pointsChange === 10 && creditChange === 0) {
      console.log('✅ ¡CORRECTO! Se otorgaron 10 puntos y NO se devolvió dinero');
    } else if (creditChange === 10 && pointsChange === 0) {
      console.log('❌ ERROR: Se devolvió dinero en lugar de otorgar puntos');
    } else {
      console.log('⚠️  Resultado inesperado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCancellation();
