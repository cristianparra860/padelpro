const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCancelledBookings() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'alex@example.com' }
    });
    
    console.log('🔍 Verificando reservas CANCELADAS...\n');
    
    // Obtener todas las reservas canceladas
    const cancelled = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: 'CANCELLED'
      },
      include: {
        timeSlot: {
          select: {
            id: true,
            start: true,
            totalPrice: true,
            courtId: true,
            courtNumber: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    });
    
    console.log(`🚫 Reservas canceladas (últimas 20): ${cancelled.length}\n`);
    
    cancelled.forEach((b, i) => {
      const slotTime = new Date(Number(b.timeSlot.start));
      const updatedTime = new Date(Number(b.updatedAt));
      
      const wasConfirmed = b.timeSlot.courtNumber !== null;
      const shouldHaveGivenPoints = wasConfirmed && b.amountBlocked > 0;
      
      console.log(`${i + 1}. Booking ID: ${b.id}`);
      console.log(`   Clase: ${slotTime.toLocaleString('es-ES')}`);
      console.log(`   Cancelada: ${updatedTime.toLocaleString('es-ES')}`);
      console.log(`   Monto bloqueado: ${b.amountBlocked / 100}€`);
      console.log(`   CourtNumber: ${b.timeSlot.courtNumber || 'NULL'}`);
      console.log(`   ${wasConfirmed ? '✅ ERA CONFIRMADA' : '⚠️  ERA PENDIENTE'}`);
      console.log(`   ${shouldHaveGivenPoints ? '💰 DEBIÓ otorgar ' + Math.floor(b.amountBlocked / 100) + ' puntos' : '🔒 No debía otorgar puntos'}`);
      console.log('');
    });
    
    // Buscar si hay alguna cancelación reciente sin transacción correspondiente
    console.log('\n🔎 Buscando cancelaciones que NO tienen transacción de puntos...\n');
    
    const pointsTxs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'points'
      },
      select: {
        relatedId: true,
        createdAt: true,
        amount: true
      }
    });
    
    const txBookingIds = new Set(pointsTxs.map(tx => tx.relatedId));
    
    const missingTxs = cancelled.filter(b => {
      const wasConfirmed = b.timeSlot.courtNumber !== null;
      return wasConfirmed && b.amountBlocked > 0 && !txBookingIds.has(b.id);
    });
    
    console.log(`⚠️  Cancelaciones CONFIRMADAS sin transacción de puntos: ${missingTxs.length}\n`);
    
    if (missingTxs.length > 0) {
      console.log('❌ PROBLEMA ENCONTRADO: Estas cancelaciones deberían tener transacción de puntos:\n');
      missingTxs.forEach((b, i) => {
        const slotTime = new Date(Number(b.timeSlot.start));
        const cancelTime = new Date(Number(b.updatedAt));
        console.log(`${i + 1}. Booking ${b.id}`);
        console.log(`   Clase: ${slotTime.toLocaleString('es-ES')}`);
        console.log(`   Cancelada: ${cancelTime.toLocaleString('es-ES')}`);
        console.log(`   Debió otorgar: ${Math.floor(b.amountBlocked / 100)} puntos`);
        console.log('');
      });
    } else {
      console.log('✅ Todas las cancelaciones confirmadas tienen su transacción de puntos');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCancelledBookings();
