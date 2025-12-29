// Script para probar cancelación de clase con reservas (sin emojis)
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

    console.log('\n[OK] Clase encontrada:');
    console.log('  ID:', timeSlot.id);
    console.log('  Fecha:', new Date(Number(timeSlot.start)).toLocaleString('es-ES'));
    console.log('  Precio total:', timeSlot.totalPrice);
    console.log('  Reservas:', timeSlot.bookings.length);

    console.log('\n[INFO] Reservas:');
    for (const booking of timeSlot.bookings) {
      console.log('  -', booking.user.name, '|', booking.groupSize, 'jugadores |', booking.status, '|', booking.paymentMethod);
    }

    console.log('\n[INFO] Calculando reembolsos...');
    
    const classDate = new Date(Number(timeSlot.start)).toLocaleDateString('es-ES');
    
    for (const booking of timeSlot.bookings) {
      const pricePerPerson = Math.ceil((timeSlot.totalPrice || 25) / booking.groupSize);
      const amountToRefund = pricePerPerson * 100;
      
      console.log('\n[USER]', booking.user.name);
      console.log('  Precio por persona:', pricePerPerson, 'euros');
      console.log('  Monto a reembolsar:', amountToRefund, 'centimos');
      console.log('  Metodo de pago:', booking.paymentMethod);
      console.log('  Pago con puntos:', booking.paidWithPoints);

      if (booking.paymentMethod === 'POINTS' || booking.paidWithPoints) {
        console.log('  [ACCION] Reembolsar PUNTOS');
        console.log('  [CANTIDAD]', pricePerPerson, 'puntos');
        
        const userData = await prisma.user.findUnique({
          where: { id: booking.userId },
          select: { loyaltyPoints: true }
        });
        console.log('  [ANTES]', userData.loyaltyPoints, 'puntos');
        console.log('  [DESPUES]', userData.loyaltyPoints + pricePerPerson, 'puntos');
        
      } else {
        console.log('  [ACCION] Reembolsar CREDITOS');
        console.log('  [CANTIDAD]', amountToRefund, 'centimos (', (amountToRefund/100).toFixed(2), 'euros)');
        
        const userData = await prisma.user.findUnique({
          where: { id: booking.userId },
          select: { credit: true }
        });
        console.log('  [ANTES]', userData.credit, 'centimos');
        console.log('  [DESPUES]', userData.credit + amountToRefund, 'centimos');
      }
      
      console.log('\n  [TEST] Probando estructura de transaccion...');
      try {
        const transactionData = {
          userId: booking.userId,
          amount: booking.paymentMethod === 'POINTS' ? Number(pricePerPerson) : Number(amountToRefund),
          balance: 0,
          type: booking.paymentMethod === 'POINTS' ? 'points' : 'credit',
          action: 'refund',
          concept: `Reembolso por cancelacion de clase por instructor - ${classDate}`,
          relatedId: timeSlot.id,
          relatedType: 'booking'
        };
        
        console.log('  [DATA]', JSON.stringify(transactionData, null, 2));
        console.log('  [OK] Estructura correcta');
        
      } catch (error) {
        console.error('  [ERROR] Al crear transaccion:', error.message);
        throw error;
      }
    }

    console.log('\n[SUCCESS] Prueba completada sin errores');
    console.log('[INFO] No se modifico la base de datos (modo prueba)');

  } catch (error) {
    console.error('\n[ERROR] En la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancelClass();
