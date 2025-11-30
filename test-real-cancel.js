const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancelFromUI() {
  try {
    const userId = 'user-1763677110798-mq6nvxq88'; // María García
    
    // Estado ANTES
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, credits: true, points: true }
    });
    
    const booking = await prisma.booking.findFirst({
      where: { 
        userId: userId,
        status: 'CONFIRMED'
      },
      include: {
        timeSlot: {
          select: { start: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!booking) {
      console.log('❌ No hay bookings CONFIRMED para cancelar');
      return;
    }
    
    console.log('👤 Usuario:', userBefore.name);
    console.log('\n💰 ANTES DE CANCELAR:');
    console.log('   Créditos: €' + userBefore.credits);
    console.log('   Puntos:', userBefore.points);
    
    console.log('\n📋 Booking a cancelar:');
    console.log('   ID:', booking.id);
    console.log('   TimeSlot:', booking.timeSlotId);
    console.log('   Fecha:', new Date(booking.timeSlot.start).toLocaleString('es-ES'));
    console.log('   Amount: €' + booking.amountBlocked);
    console.log('   Status:', booking.status);
    
    // Simular el request exactamente como lo hace la UI
    console.log('\n🚀 Llamando a /api/classes/cancel con los MISMOS parámetros que la UI...');
    
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
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`\n❌ Error ${response.status}:`, error);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ Respuesta del API:');
    console.log(JSON.stringify(result, null, 2));
    
    // Esperar 1 segundo para que la DB se actualice
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Estado DESPUÉS
    const userAfter = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    console.log('\n💰 DESPUÉS DE CANCELAR:');
    console.log('   Créditos: €' + userAfter.credits + ' (cambio: ' + (userAfter.credits - userBefore.credits) + ')');
    console.log('   Puntos:', userAfter.points + ' (cambio: +' + (userAfter.points - userBefore.points) + ')');
    
    // Verificar última transacción
    const lastTransaction = await prisma.transaction.findFirst({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📝 Última transacción:');
    console.log('   Tipo:', lastTransaction.type);
    console.log('   Acción:', lastTransaction.action);
    console.log('   Monto:', lastTransaction.amount);
    console.log('   Concepto:', lastTransaction.concept);
    console.log('   Created:', new Date(lastTransaction.createdAt).toLocaleTimeString('es-ES'));
    
    // Verificación final
    const pointsGranted = userAfter.points - userBefore.points;
    const expectedPoints = Math.floor(booking.amountBlocked);
    const creditsChanged = userAfter.credits - userBefore.credits;
    
    console.log('\n' + '='.repeat(70));
    if (pointsGranted === expectedPoints && creditsChanged === 0 && lastTransaction.type === 'points') {
      console.log('✅✅✅ ¡SISTEMA FUNCIONA CORRECTAMENTE! ✅✅✅');
      console.log('\n   ✅ Se otorgaron', pointsGranted, 'puntos (esperado:', expectedPoints + ')');
      console.log('   ✅ Créditos sin cambios (esperado: 0)');
      console.log('   ✅ Transacción registrada como tipo "points"');
      console.log('   ✅ La transacción aparecerá en el panel de puntos');
    } else {
      console.log('❌ ERROR: Algo no funcionó correctamente');
      console.log('\n   Puntos otorgados:', pointsGranted, '(esperado:', expectedPoints + ')');
      console.log('   Créditos devueltos: €' + creditsChanged, '(esperado: 0)');
      console.log('   Tipo transacción:', lastTransaction.type, '(esperado: points)');
    }
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancelFromUI();
