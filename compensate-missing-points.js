const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compensateMissingPoints() {
  console.log('\n🔧 Compensando puntos faltantes por bug en sistema de carrera\n');
  
  const userId = 'cmhkwi8so0001tggo0bwojrjy';
  const bookingId = 'booking-1762875992163-jbkvohdj2';
  const amountBlocked = 1250; // 12.5€
  const pointsToGrant = Math.floor(amountBlocked / 100); // 12 puntos
  
  // Verificar si ya existe una transacción de puntos para este booking
  const existingPointsTx = await prisma.transaction.findFirst({
    where: {
      relatedId: bookingId,
      type: 'points'
    }
  });
  
  if (existingPointsTx) {
    console.log('✅ Ya existe una transacción de puntos para este booking');
    console.log(`   ID: ${existingPointsTx.id}`);
    console.log(`   Puntos: ${existingPointsTx.amount}\n`);
    await prisma.$disconnect();
    return;
  }
  
  console.log(`📋 Booking: ${bookingId}`);
  console.log(`💰 Monto bloqueado: ${amountBlocked / 100}€`);
  console.log(`🎁 Puntos a otorgar: ${pointsToGrant}\n`);
  
  // Obtener puntos actuales del usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true, name: true }
  });
  
  if (!user) {
    console.log('❌ Usuario no encontrado\n');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`👤 Usuario: ${user.name}`);
  console.log(`🌟 Puntos actuales: ${user.points}`);
  console.log(`🌟 Puntos después: ${user.points + pointsToGrant}\n`);
  
  // Otorgar puntos
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: pointsToGrant
      }
    }
  });
  
  // Crear transacción de compensación
  await prisma.transaction.create({
    data: {
      userId: userId,
      type: 'points',
      action: 'add',
      amount: pointsToGrant,
      balance: updatedUser.points,
      concept: `Compensación retroactiva - Clase cancelada por sistema de carrera`,
      relatedId: bookingId,
      relatedType: 'booking',
      metadata: JSON.stringify({
        timeSlotId: 'ts_1762663004374_68yceod3u',
        groupSize: 2,
        status: 'CANCELLED',
        reason: 'Compensación manual por bug - Clase confirmada cancelada sin otorgar puntos',
        originalAmount: amountBlocked,
        correctionDate: new Date().toISOString()
      })
    }
  });
  
  console.log(`✅ Compensación aplicada exitosamente`);
  console.log(`   Puntos otorgados: ${pointsToGrant}`);
  console.log(`   Nuevo saldo: ${updatedUser.points} puntos\n`);
  
  await prisma.$disconnect();
}

compensateMissingPoints();
