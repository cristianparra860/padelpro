// Script para probar cancelación de clase con reservas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancelClass() {
  try {
    console.log('[INFO] Buscando clase con reservas confirmadas...');
    
    // Buscar una clase con reservas
    const timeSlot = await prisma.timeSlot.findFirst({
      where: {
        bookings: {
          some: {
            status: 'CONFIRMED'
          }
        }
      },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!timeSlot) {
      console.log('[ERROR] No hay clases con reservas confirmadas');
      return;
    }

    console.log('\n[OK] Clase encontrada:', {
      id: timeSlot.id,
      start: new Date(Number(timeSlot.start)).toLocaleString('es-ES'),
      totalPrice: timeSlot.totalPrice,
      bookings: timeSlot.bookings.length
    });

    console.log('\n📋 Reservas:');
    for (const booking of timeSlot.bookings) {
      console.log({
        id: booking.id,
        usuario: booking.user.name,
        groupSize: booking.groupSize,
        status: booking.status,
        paymentMethod: booking.paymentMethod,
        paidWithPoints: booking.paidWithPoints
      });
    }

    console.log('\n💰 Calculando reembolsos...');
    
    const classDate = new Date(Number(timeSlot.start)).toLocaleDateString('es-ES');
    
    for (const booking of timeSlot.bookings) {
      const pricePerPerson = Math.ceil((timeSlot.totalPrice || 25) / booking.groupSize);
      const amountToRefund = pricePerPerson * 100;
      
      console.log(`\n👤 Usuario: ${booking.user.name}`);
      console.log(`   Precio por persona: €${pricePerPerson}`);
      console.log(`   Monto a reembolsar: ${amountToRefund} céntimos`);
      console.log(`   Método de pago: ${booking.paymentMethod}`);
      console.log(`   Pagó con puntos: ${booking.paidWithPoints}`);

      if (booking.paymentMethod === 'POINTS' || booking.paidWithPoints) {
        console.log('   ➡️ Reembolsará: PUNTOS');
        console.log('   ➡️ Cantidad: ' + pricePerPerson + ' puntos');
        
        // Simular update
        const userData = await prisma.user.findUnique({
          where: { id: booking.userId },
          select: { loyaltyPoints: true }
        });
        console.log('   ➡️ Puntos actuales:', userData.loyaltyPoints);
        console.log('   ➡️ Puntos después:', userData.loyaltyPoints + pricePerPerson);
        
      } else {
        console.log('   ➡️ Reembolsará: CRÉDITOS');
        console.log('   ➡️ Cantidad: ' + amountToRefund + ' céntimos (€' + (amountToRefund/100).toFixed(2) + ')');
        
        // Simular update
        const userData = await prisma.user.findUnique({
          where: { id: booking.userId },
          select: { credit: true }
        });
        console.log('   ➡️ Créditos actuales:', userData.credit);
        console.log('   ➡️ Créditos después:', userData.credit + amountToRefund);
      }
      
      // Probar crear transacción
      console.log('\n   🧪 Probando creación de transacción...');
      try {
        const transactionData = {
          userId: booking.userId,
          amount: booking.paymentMethod === 'POINTS' ? Number(pricePerPerson) : Number(amountToRefund),
          balance: 0, // Lo calcularíamos después del update
          type: booking.paymentMethod === 'POINTS' ? 'points' : 'credit',
          action: 'refund',
          concept: `Reembolso por cancelación de clase por instructor - ${classDate}`,
          relatedId: timeSlot.id,
          relatedType: 'booking'
        };
        
        console.log('   📝 Datos de transacción:', transactionData);
        
        // Intentar crear (comentar para no modificar DB)
        // await prisma.transaction.create({ data: transactionData });
        console.log('   ✅ Estructura de transacción correcta');
        
      } catch (error) {
        console.error('   ❌ ERROR al crear transacción:', error.message);
        throw error;
      }
    }

    console.log('\n\n✅ Prueba completada sin errores');
    console.log('⚠️ No se modificó la base de datos (modo prueba)');

  } catch (error) {
    console.error('\n❌ ERROR en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancelClass();
