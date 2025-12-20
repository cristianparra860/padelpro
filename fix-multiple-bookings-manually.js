const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMultipleBookingsManually() {
  try {
    console.log('\n🔧 CORRIGIENDO INSCRIPCIONES MÚLTIPLES DEL MISMO DÍA\n');
    
    // Buscar usuario Marc
    const marc = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' },
      select: { id: true, name: true, email: true, credits: true }
    });
    
    if (!marc) {
      console.log('❌ Usuario no encontrado');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`👤 Usuario: ${marc.name}`);
    console.log(`   Créditos actuales: €${(Number(marc.credits)/100).toFixed(2)}\n`);
    
    // Días con problemas detectados
    const problemDays = ['2025-12-04', '2025-12-17'];
    
    for (const day of problemDays) {
      console.log(`\n📅 Procesando ${day}...`);
      
      const startOfDay = `${day}T00:00:00.000Z`;
      const endOfDay = `${day}T23:59:59.999Z`;
      
      // Obtener todas las inscripciones del día
      const bookings = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.status,
          b.amountBlocked,
          b.paidWithPoints,
          b.pointsUsed,
          ts.start,
          ts.courtNumber,
          ts.id as timeSlotId
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${marc.id}
        AND ts.start >= ${startOfDay}
        AND ts.start <= ${endOfDay}
        AND b.status IN ('PENDING', 'CONFIRMED')
        ORDER BY ts.start
      `;
      
      console.log(`   Total inscripciones: ${bookings.length}`);
      
      const confirmed = bookings.filter(b => b.status === 'CONFIRMED' && b.courtNumber !== null);
      const pending = bookings.filter(b => b.status === 'PENDING' || b.courtNumber === null);
      
      console.log(`   ✅ Confirmadas con pista: ${confirmed.length}`);
      console.log(`   ⏳ Pendientes sin pista: ${pending.length}`);
      
      if (confirmed.length > 0 && pending.length > 0) {
        console.log(`\n   ⚠️  PROBLEMA DETECTADO - Cancelando ${pending.length} inscripciones pendientes...\n`);
        
        for (const booking of pending) {
          const time = new Date(booking.start).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
          const amountBlocked = Number(booking.amountBlocked);
          const isPaidWithPoints = booking.paidWithPoints === 1;
          const pointsBlocked = booking.pointsUsed || 0;
          
          console.log(`   🗑️  Cancelando inscripción ${time} (${booking.id})`);
          
          // Cambiar estado a CANCELLED
          await prisma.$executeRaw`
            UPDATE Booking 
            SET status = 'CANCELLED', updatedAt = datetime('now')
            WHERE id = ${booking.id}
          `;
          
          // Desbloquear créditos/puntos
          if (isPaidWithPoints) {
            await prisma.$executeRaw`
              UPDATE User
              SET points = points + ${pointsBlocked}, updatedAt = datetime('now')
              WHERE id = ${marc.id}
            `;
            console.log(`      ✅ Desbloqueados ${pointsBlocked} puntos`);
          } else {
            await prisma.$executeRaw`
              UPDATE User
              SET credits = credits + ${amountBlocked}, updatedAt = datetime('now')
              WHERE id = ${marc.id}
            `;
            console.log(`      ✅ Desbloqueados €${(amountBlocked/100).toFixed(2)}`);
          }
          
          // Crear transacción
          const userAfter = await prisma.user.findUnique({
            where: { id: marc.id },
            select: { credits: true, points: true }
          });
          
          const transactionData = {
            id: `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            userId: marc.id,
            type: isPaidWithPoints ? 'points' : 'credit',
            action: 'add',
            amount: isPaidWithPoints ? pointsBlocked : amountBlocked,
            balance: isPaidWithPoints ? userAfter.points : Number(userAfter.credits),
            concept: 'Inscripción cancelada automáticamente - Ya tienes una reserva confirmada este día',
            relatedId: booking.id,
            relatedType: 'booking',
            metadata: JSON.stringify({
              timeSlotId: booking.timeSlotId,
              reason: 'one_booking_per_day_rule',
              fixedManually: true
            }),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await prisma.transaction.create({ data: transactionData });
        }
        
        console.log(`\n   ✅ Canceladas ${pending.length} inscripciones pendientes`);
      } else {
        console.log(`   ✅ No hay problema en este día`);
      }
    }
    
    // Mostrar resultado final
    const userFinal = await prisma.user.findUnique({
      where: { id: marc.id },
      select: { credits: true }
    });
    
    console.log(`\n✅ PROCESO COMPLETADO`);
    console.log(`   Créditos finales: €${(Number(userFinal.credits)/100).toFixed(2)}\n`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

fixMultipleBookingsManually();
