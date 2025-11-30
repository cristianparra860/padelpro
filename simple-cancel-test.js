const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancel() {
  try {
    console.log('🔍 Buscando booking CONFIRMED...');
    
    const booking = await prisma.booking.findFirst({
      where: { 
        status: 'CONFIRMED',
        userId: 'user-1763677035576-wv1t7iun0'
      }
    });
    
    if (!booking) {
      console.log('❌ No hay bookings CONFIRMED');
      return;
    }
    
    console.log('\n📋 Booking encontrado:');
    console.log(`   ID: ${booking.id}`);
    console.log(`   TimeSlot: ${booking.timeSlotId}`);
    console.log(`   Amount: €${booking.amountBlocked}`);
    
    // Estado ANTES
    const userBefore = await prisma.user.findUnique({
      where: { id: booking.userId }
    });
    
    console.log('\n💰 SALDO ANTES:');
    console.log(`   Créditos: €${userBefore.credits}`);
    console.log(`   Puntos: ${userBefore.points}`);
    
    // Llamar al endpoint
    console.log('\n🚀 Llamando a /api/classes/cancel...');
    
    const response = await fetch('http://localhost:9002/api/classes/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: booking.id,
        userId: booking.userId,
        timeSlotId: booking.timeSlotId
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Error ${response.status}: ${error}`);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ Respuesta del API:');
    console.log(JSON.stringify(result, null, 2));
    
    // Esperar 1 segundo para que la DB se actualice
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Estado DESPUÉS
    const userAfter = await prisma.user.findUnique({
      where: { id: booking.userId }
    });
    
    console.log('\n💰 SALDO DESPUÉS:');
    console.log(`   Créditos: €${userAfter.credits} (cambio: ${userAfter.credits - userBefore.credits})`);
    console.log(`   Puntos: ${userAfter.points} (cambio: +${userAfter.points - userBefore.points})`);
    
    // Verificar transacción
    const lastTransaction = await prisma.transaction.findFirst({
      where: { userId: booking.userId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📝 Última transacción:');
    console.log(`   Tipo: ${lastTransaction.type}`);
    console.log(`   Acción: ${lastTransaction.action}`);
    console.log(`   Monto: ${lastTransaction.amount}`);
    console.log(`   Concepto: ${lastTransaction.concept}`);
    
    // Verificación final
    const pointsGranted = userAfter.points - userBefore.points;
    const expectedPoints = Math.floor(booking.amountBlocked);
    
    console.log('\n' + '='.repeat(60));
    if (pointsGranted === expectedPoints && userAfter.credits === userBefore.credits) {
      console.log('✅ ¡CORRECTO! Se otorgaron puntos y NO se devolvió dinero');
      console.log(`   Puntos otorgados: ${pointsGranted} (esperado: ${expectedPoints})`);
    } else {
      console.log('❌ ERROR: Comportamiento incorrecto');
      console.log(`   Puntos otorgados: ${pointsGranted} (esperado: ${expectedPoints})`);
      console.log(`   Créditos devueltos: €${userAfter.credits - userBefore.credits} (esperado: 0)`);
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancel();
