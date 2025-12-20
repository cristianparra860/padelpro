const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAutoCancelSameDay() {
  try {
    console.log('🔍 VERIFICANDO AUTO-CANCELACIÓN DEL MISMO DÍA\n');
    
    // 1. Buscar inscripciones del usuario Marc (que aparece en las imágenes)
    const marc = await prisma.user.findFirst({
      where: { name: { contains: 'Marc' } },
      select: { id: true, name: true, email: true }
    });
    
    if (!marc) {
      console.log('❌ No se encontró el usuario Marc');
      return;
    }
    
    console.log(`👤 Usuario: ${marc.name} (${marc.email})`);
    console.log(`   ID: ${marc.id}\n`);
    
    // 2. Buscar todas sus inscripciones del 17 de diciembre
    const targetDate = new Date('2025-12-17T00:00:00Z');
    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));
    
    console.log(`📅 Buscando inscripciones del ${targetDate.toISOString().split('T')[0]}`);
    console.log(`   Rango: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}\n`);
    
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id, 
        b.status, 
        b.groupSize,
        b.amountBlocked,
        b.paidWithPoints,
        b.pointsUsed,
        ts.id as timeSlotId,
        ts.start,
        ts.courtNumber,
        ts.courtId
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marc.id}
      AND ts.start >= ${startOfDay.toISOString()}
      AND ts.start <= ${endOfDay.toISOString()}
      ORDER BY ts.start ASC
    `;
    
    console.log(`📊 Total de inscripciones encontradas: ${bookings.length}\n`);
    
    bookings.forEach((booking, index) => {
      const time = new Date(booking.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const isConfirmed = booking.status === 'CONFIRMED';
      const hasCourt = booking.courtNumber !== null;
      const amount = Number(booking.amountBlocked);
      const payment = booking.paidWithPoints ? `${booking.pointsUsed} puntos` : `€${(amount/100).toFixed(2)}`;
      
      console.log(`${index + 1}. ⏰ ${time} - ${booking.status}`);
      console.log(`   Slot ID: ${booking.timeSlotId}`);
      console.log(`   Booking ID: ${booking.id}`);
      console.log(`   Grupo: ${booking.groupSize} jugadores`);
      console.log(`   Pista: ${hasCourt ? `Pista ${booking.courtNumber}` : '❌ SIN ASIGNAR'}`);
      console.log(`   Monto bloqueado: ${payment}`);
      console.log(`   Estado: ${isConfirmed ? '✅ CONFIRMADA' : '⏳ PENDIENTE'}\n`);
    });
    
    // 3. Identificar la lógica esperada
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED' && b.courtNumber !== null);
    const pendingBookings = bookings.filter(b => b.status === 'PENDING' || b.courtNumber === null);
    
    console.log('\n🎯 ANÁLISIS:');
    console.log(`   ✅ Reservas confirmadas (con pista): ${confirmedBookings.length}`);
    console.log(`   ⏳ Inscripciones pendientes (sin pista): ${pendingBookings.length}\n`);
    
    if (confirmedBookings.length > 0 && pendingBookings.length > 0) {
      console.log('⚠️  PROBLEMA DETECTADO:');
      console.log('   El usuario tiene una reserva confirmada Y inscripciones pendientes');
      console.log('   Las inscripciones pendientes deberían haberse cancelado automáticamente\n');
      
      // 4. Probar la función de cancelación manualmente
      console.log('🔧 EJECUTANDO CANCELACIÓN MANUAL DE INSCRIPCIONES PENDIENTES...\n');
      
      const confirmedSlot = confirmedBookings[0];
      const slotDate = new Date(confirmedSlot.start);
      const startOfDayStr = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0)).toISOString();
      const endOfDayStr = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 23, 59, 59, 999)).toISOString();
      
      const otherBookings = await prisma.$queryRaw`
        SELECT b.id, b.userId, b.timeSlotId, b.amountBlocked, b.status, ts.start, ts.courtNumber
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${marc.id}
        AND b.status IN ('PENDING', 'CONFIRMED')
        AND b.timeSlotId != ${confirmedSlot.timeSlotId}
        AND ts.start >= ${startOfDayStr}
        AND ts.start <= ${endOfDayStr}
      `;
      
      console.log(`   Inscripciones a cancelar: ${otherBookings.length}`);
      
      for (const booking of otherBookings) {
        const bookingTime = new Date(booking.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const amountBlocked = Number(booking.amountBlocked);
        
        console.log(`   🗑️  Cancelando inscripción ${booking.id} (${bookingTime})`);
        
        // Obtener información del pago
        const bookingInfo = await prisma.booking.findUnique({
          where: { id: booking.id },
          select: { paidWithPoints: true, pointsUsed: true }
        });
        
        const isPaidWithPoints = bookingInfo?.paidWithPoints || false;
        const pointsBlocked = bookingInfo?.pointsUsed || 0;
        
        // Cancelar la inscripción
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
            reason: 'one_booking_per_day_rule'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await prisma.transaction.create({ data: transactionData });
        console.log(`      📝 Transacción creada\n`);
      }
      
      console.log('✅ CANCELACIÓN MANUAL COMPLETADA\n');
      
      // 5. Verificar el resultado
      const bookingsAfter = await prisma.$queryRaw`
        SELECT 
          b.id, 
          b.status, 
          ts.start,
          ts.courtNumber
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${marc.id}
        AND ts.start >= ${startOfDay.toISOString()}
        AND ts.start <= ${endOfDay.toISOString()}
        ORDER BY ts.start ASC
      `;
      
      console.log('📊 ESTADO FINAL:');
      bookingsAfter.forEach((booking) => {
        const time = new Date(booking.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const hasCourt = booking.courtNumber !== null;
        const icon = booking.status === 'CONFIRMED' ? '✅' : booking.status === 'CANCELLED' ? '❌' : '⏳';
        
        console.log(`   ${icon} ${time} - ${booking.status} ${hasCourt ? `(Pista ${booking.courtNumber})` : ''}`);
      });
      
    } else if (confirmedBookings.length === 0) {
      console.log('ℹ️  No hay reservas confirmadas - No se requiere cancelación');
    } else {
      console.log('✅ Comportamiento correcto - Solo hay reservas confirmadas, sin inscripciones pendientes');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoCancelSameDay();
