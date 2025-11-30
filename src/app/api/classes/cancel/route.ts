// src/app/api/classes/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  updateUserBlockedCredits, 
  grantCompensationPoints, 
  markSlotAsRecycled 
} from '@/lib/blockedCredits';
import { createTransaction } from '@/lib/transactionLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, userId, timeSlotId } = body;

    console.log('🗑️ Solicitud de cancelación:', { bookingId, userId, timeSlotId });

    // Verificar que tenemos los datos necesarios
    if (!userId || !timeSlotId) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos: userId y timeSlotId' 
      }, { status: 400 });
    }

    // Buscar la reserva del usuario para esta clase usando raw SQL
    const bookingQuery = await prisma.$queryRaw`
      SELECT * FROM Booking 
      WHERE userId = ${userId} 
      AND timeSlotId = ${timeSlotId}
      AND status IN ('PENDING', 'CONFIRMED')
      LIMIT 1
    ` as Array<{id: string, userId: string, timeSlotId: string, groupSize: number, status: string}>;

    console.log('🔍 Búsqueda de reserva:', { userId, timeSlotId, encontradas: bookingQuery?.length || 0 });

    if (!bookingQuery || bookingQuery.length === 0) {
      console.log('❌ No se encontró reserva activa');
      return NextResponse.json({ 
        error: 'No se encontró la reserva para cancelar' 
      }, { status: 404 });
    }

    const booking = bookingQuery[0];
    console.log('✅ Reserva encontrada:', { id: booking.id, status: booking.status, groupSize: booking.groupSize });

    // 1️⃣ Obtener información del TimeSlot para reembolso
    const timeSlotQuery = await prisma.$queryRaw`
      SELECT totalPrice, courtId, courtNumber, start, end, instructorId 
      FROM TimeSlot 
      WHERE id = ${timeSlotId}
    ` as Array<{totalPrice: number, courtId: string | null, courtNumber: number | null, start: string, end: string, instructorId: string}>;

    if (!timeSlotQuery || timeSlotQuery.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontró información de la clase' 
      }, { status: 404 });
    }

    const timeSlotInfo = timeSlotQuery[0];
    const isConfirmedClass = timeSlotInfo.courtNumber !== null; // Tiene pista asignada = confirmada
    
    console.log(`📍 Clase ${isConfirmedClass ? 'CONFIRMADA' : 'PENDIENTE'} (pista: ${timeSlotInfo.courtNumber || 'ninguna'})`);
    
    // Obtener información del booking para saber cuánto estaba bloqueado
    const bookingInfo = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { amountBlocked: true, status: true }
    });
    
    const amountBlocked = bookingInfo?.amountBlocked || 0;
    const bookingStatus = bookingInfo?.status;
    const isBookingConfirmed = bookingStatus === 'CONFIRMED';
    
    console.log(`💰 Monto bloqueado: €${amountBlocked.toFixed(2)}`);
    console.log(`📊 Booking Status: ${bookingStatus}`);
    console.log(`🎾 Clase tiene pista asignada: ${isConfirmedClass ? 'SÍ (pista ' + timeSlotInfo.courtNumber + ')' : 'NO'}`);
    console.log(`🔍 ¿Booking confirmado?: ${isBookingConfirmed ? 'SÍ' : 'NO'}`);
    
    // LÓGICA: Si el BOOKING está CONFIRMED, el usuario ya pagó → otorgar PUNTOS
    // Si el BOOKING está PENDING, solo estaba bloqueado → devolver dinero con penalización
    if (isBookingConfirmed) {
      // ♻️ CANCELACIÓN DE RESERVA CONFIRMADA (usuario ya pagó)
      // 🎯 REGLA: Otorgar PUNTOS de compensación (1€ = 1 punto)
      console.log('♻️ Cancelación de reserva CONFIRMADA - Otorgando PUNTOS de compensación...');
      
      // Marcar el BOOKING como cancelado Y reciclado
      console.log('🔵 [CANCEL] Marcando booking como CANCELLED e isRecycled=true...');
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CANCELLED', isRecycled = 1, updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      console.log('✅ [CANCEL] Booking marcado como CANCELLED e isRecycled=true');
      
      // Otorgar puntos de compensación (1€ = 1 punto, amountBlocked ya está en euros)
      // Pasamos skipTransaction=true porque registramos la transacción manualmente después
      const pointsGranted = Math.floor(amountBlocked);
      const newPoints = await grantCompensationPoints(userId, amountBlocked, true);
      
      console.log(`🎁 Otorgados ${pointsGranted} puntos al usuario. Total puntos: ${newPoints}`);
      
      // Marcar el TimeSlot con hasRecycledSlots para indicar que tiene plazas disponibles
      await markSlotAsRecycled(timeSlotId);
      console.log(`♻️ TimeSlot marcado con hasRecycledSlots=true`);
      
      // 📝 REGISTRAR TRANSACCIÓN DE PUNTOS
      await createTransaction({
        userId,
        type: 'points',
        action: 'add',
        amount: pointsGranted,
        balance: newPoints,
        concept: `Compensación por cesión de plaza - Clase ${new Date(timeSlotInfo.start).toLocaleString('es-ES')}`,
        relatedId: booking.id,
        relatedType: 'booking',
        metadata: {
          timeSlotId,
          groupSize: booking.groupSize,
          status: 'CANCELLED',
          reason: 'Plaza cedida con puntos de compensación',
          originalAmount: amountBlocked,
          isRecycled: true
        }
      });
      
      // 🚨 IMPORTANTE: La clase NUNCA se cancela completamente
      // La pista sigue asignada, la clase se ejecuta con los jugadores restantes
      // Si nadie reserva la plaza reciclada, la clase se ejecuta igual
      
      return NextResponse.json({ 
        success: true,
        message: `Plaza cedida exitosamente. Has recibido ${pointsGranted} puntos de compensación. La plaza queda disponible para reservar con puntos. La clase se ejecutará de todas formas.`,
        cancelledBookingId: booking.id,
        amountUnblocked: 0,
        pointsGranted: pointsGranted,
        slotMarkedAsRecycled: true,
        classStillActive: true,
        courtRemains: timeSlotInfo.courtNumber
      });
      
    } else {
      // 🔓 CANCELACIÓN DE RESERVA PENDIENTE (solo estaba bloqueado, no cobrado)
      // 💸 REGLA: Penalización de €1 + devolución del resto
      console.log('🔓 Cancelación de reserva PENDIENTE - Aplicando penalización de €1 y devolviendo resto...');
      
      const PENALTY_AMOUNT = 1; // €1 (ya en euros)
      const refundAmount = Math.max(0, amountBlocked - PENALTY_AMOUNT);
      
      console.log(`💰 Monto bloqueado: €${amountBlocked.toFixed(2)}`);
      console.log(`💸 Penalización: €${PENALTY_AMOUNT.toFixed(2)}`);
      console.log(`💵 Devolución: €${refundAmount.toFixed(2)}`);
      
      // Marcar como cancelada
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CANCELLED', updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      
      console.log('✅ Reserva marcada como CANCELLED en la BD');
      
      // Actualizar blockedCredits del usuario (se recalcula automáticamente)
      const newBlockedAmount = await updateUserBlockedCredits(userId);
      
      // 💵 DEVOLVER EL SALDO (monto bloqueado - penalización)
      if (refundAmount > 0) {
        await prisma.$executeRaw`
          UPDATE User
          SET credits = credits + ${refundAmount}, updatedAt = datetime('now')
          WHERE id = ${userId}
        `;
        console.log(`✅ Devueltos €${refundAmount.toFixed(2)} al saldo del usuario`);
      }
      
      // 📝 REGISTRAR TRANSACCIÓN DE PENALIZACIÓN
      const userBalance = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, blockedCredits: true }
      });
      
      if (userBalance) {
        // Transacción de penalización
        await createTransaction({
          userId,
          type: 'credit',
          action: 'deduct',
          amount: PENALTY_AMOUNT,
          balance: userBalance.credits - userBalance.blockedCredits,
          concept: `Penalización por cancelación - Clase ${new Date(timeSlotInfo.start).toLocaleString('es-ES')}`,
          relatedId: booking.id,
          relatedType: 'booking',
          metadata: {
            timeSlotId,
            groupSize: booking.groupSize,
            status: 'CANCELLED',
            reason: 'Penalización por cancelación de clase pendiente',
            originalAmount: amountBlocked,
            refundAmount: refundAmount
          }
        });
        
        // Transacción de devolución (si hay algo que devolver)
        if (refundAmount > 0) {
          await createTransaction({
            userId,
            type: 'credit',
            action: 'add',
            amount: refundAmount,
            balance: userBalance.credits - userBalance.blockedCredits + refundAmount,
            concept: `Devolución parcial - Clase ${new Date(timeSlotInfo.start).toLocaleString('es-ES')}`,
            relatedId: booking.id,
            relatedType: 'booking',
            metadata: {
              timeSlotId,
              groupSize: booking.groupSize,
              status: 'CANCELLED',
              reason: 'Devolución después de penalización',
              penaltyApplied: PENALTY_AMOUNT
            }
          });
        }
      }
      
      console.log(`✅ Cancelación procesada. Nuevo blockedCredits: €${newBlockedAmount.toFixed(2)}`);
      
      return NextResponse.json({ 
        success: true,
        message: `Reserva cancelada. Penalización de €1 aplicada. Se han devuelto €${refundAmount.toFixed(2)} a tu saldo.`,
        cancelledBookingId: booking.id,
        penaltyAmount: PENALTY_AMOUNT,
        refundAmount: refundAmount,
        pointsGranted: 0,
        slotMarkedAsRecycled: false
      });
    }

  } catch (error) {
    console.error('❌ Error cancelando reserva:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor al cancelar la reserva',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}