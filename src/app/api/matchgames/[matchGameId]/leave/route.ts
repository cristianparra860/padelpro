import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/matchgames/[matchGameId]/leave
 * Permite a un usuario cancelar su inscripción en una partida
 * Sistema de plazas recicladas: Si la partida está CONFIRMADA (con pista asignada),
 * la plaza se libera para ser reservada con puntos (no se cancela la partida completa)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchGameId: string }> }
) {
  try {
    const { userId } = await request.json();
    const { matchGameId } = await params;
    
    console.log('🗑️ Cancelación de partida:', { matchGameId, userId });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Buscar el booking del usuario en esta partida
    const booking = await prisma.matchGameBooking.findFirst({
      where: {
        matchGameId,
        userId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      include: {
        matchGame: {
          include: {
            court: true
          }
        },
        user: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'No se encontró tu inscripción en esta partida' },
        { status: 404 }
      );
    }

    // Verificar si la partida ya empezó
    const now = new Date();
    const matchStart = new Date(booking.matchGame.start);
    
    if (matchStart <= now) {
      return NextResponse.json(
        { error: 'No puedes cancelar una partida que ya comenzó' },
        { status: 400 }
      );
    }

    // Verificar si el booking está CONFIRMED (ya pagó)
    const isBookingConfirmed = booking.status === 'CONFIRMED';
    const hasCourtAssigned = booking.matchGame.courtId !== null;
    
    const amountBlocked = booking.amountBlocked || 0;
    
    console.log(`📊 Booking Status: ${booking.status}`);
    console.log(`🎾 Partida tiene pista asignada: ${hasCourtAssigned ? 'SÍ' : 'NO'}`);
    console.log(`💰 Monto bloqueado: €${amountBlocked.toFixed(2)}`);

    if (isBookingConfirmed && hasCourtAssigned) {
      // ♻️ CANCELACIÓN DE RESERVA CONFIRMADA CON PISTA ASIGNADA
      // Sistema de plazas recicladas: la plaza se libera para reservar con puntos
      console.log('♻️ Cancelación de partida CONFIRMADA - Sistema de plazas recicladas...');
      
      const pointsGranted = Math.floor(amountBlocked);
      let finalBalance = 0;
      
      await prisma.$transaction(async (tx) => {
        // Marcar el booking como CANCELLED e isRecycled
        await tx.matchGameBooking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            isRecycled: true,
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Booking marcado como CANCELLED e isRecycled=true');
        
        // Otorgar puntos de compensación directamente en la transacción
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            points: {
              increment: pointsGranted
            }
          },
          select: { points: true }
        });
        
        finalBalance = updatedUser.points;
        
        console.log(`🎁 Otorgados ${pointsGranted} puntos al usuario. Total puntos: ${finalBalance}`);
        
        // Registrar transacción de puntos
        await tx.transaction.create({
          data: {
            userId,
            type: 'points',
            action: 'add',
            amount: pointsGranted,
            balance: finalBalance,
            concept: `Compensación por cesión de plaza - Partida ${new Date(matchStart).toLocaleString('es-ES')}`,
            relatedId: booking.id,
            relatedType: 'matchgame_booking',
            metadata: JSON.stringify({
              matchGameId,
              status: 'CANCELLED',
              reason: 'Plaza cedida con puntos de compensación',
              originalAmount: amountBlocked,
              isRecycled: true,
              courtNumber: booking.matchGame.court?.number
            })
          }
        });
        
        console.log('✅ Transacción de puntos registrada');
      });
      
      return NextResponse.json({
        success: true,
        message: `Plaza cedida exitosamente. Has recibido ${pointsGranted} puntos de compensación. La plaza queda disponible para reservar con puntos.`,
        pointsGranted: pointsGranted,
        originalAmount: amountBlocked,
        slotMarkedAsRecycled: true,
        matchStillActive: true,
        courtRemains: booking.matchGame.court?.number
      });
      
    } else {
      // 🔓 CANCELACIÓN DE RESERVA PENDIENTE (solo estaba bloqueado, no cobrado)
      // Penalización de €1 + devolución del resto
      console.log('🔓 Cancelación de partida PENDIENTE - Aplicando penalización...');
      
      const PENALTY_AMOUNT = 1; // €1
      const refundAmount = Math.max(0, amountBlocked - PENALTY_AMOUNT);
      
      console.log(`💸 Penalización: €${PENALTY_AMOUNT.toFixed(2)}`);
      console.log(`💵 Devolución: €${refundAmount.toFixed(2)}`);
      
      let finalBalance = 0;
      
      await prisma.$transaction(async (tx) => {
        // Marcar como cancelada (sin isRecycled)
        await tx.matchGameBooking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });
        
        // Devolver el saldo (monto bloqueado - penalización)
        let updatedUser;
        if (refundAmount > 0) {
          updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              credits: {
                increment: refundAmount
              }
            },
            select: { credits: true }
          });
          console.log(`✅ Devueltos €${refundAmount.toFixed(2)} al saldo del usuario`);
        } else {
          updatedUser = await tx.user.findUnique({
            where: { id: userId },
            select: { credits: true }
          });
        }
        
        finalBalance = updatedUser?.credits || 0;
        
        // Registrar transacción de penalización
        await tx.transaction.create({
          data: {
            userId,
            type: 'credit',
            action: 'deduct',
            amount: PENALTY_AMOUNT,
            balance: finalBalance,
            concept: `Penalización por cancelación - Partida ${new Date(matchStart).toLocaleString('es-ES')}`,
            relatedId: booking.id,
            relatedType: 'matchgame_booking',
            metadata: JSON.stringify({
              matchGameId,
              status: 'CANCELLED',
              reason: 'Penalización por cancelación de partida pendiente',
              originalAmount: amountBlocked,
              refundAmount: refundAmount
            })
          }
        });
        
        // Registrar transacción de devolución si hay algo que devolver
        if (refundAmount > 0) {
          await tx.transaction.create({
            data: {
              userId,
              type: 'credit',
              action: 'add',
              amount: refundAmount,
              balance: finalBalance + refundAmount,
              concept: `Devolución parcial - Partida ${new Date(matchStart).toLocaleString('es-ES')}`,
              relatedId: booking.id,
              relatedType: 'matchgame_booking',
              metadata: JSON.stringify({
                matchGameId,
                status: 'CANCELLED',
                reason: 'Devolución después de penalización',
                penaltyApplied: PENALTY_AMOUNT
              })
            }
          });
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `Reserva cancelada. Penalización de €1 aplicada. Se han devuelto €${refundAmount.toFixed(2)} a tu saldo.`,
        penaltyAmount: PENALTY_AMOUNT,
        refundAmount: refundAmount,
        pointsGranted: 0,
        slotMarkedAsRecycled: false
      });
    }

  } catch (error) {
    console.error('❌ Error al cancelar inscripción:', error);
    return NextResponse.json(
      { error: 'Error del servidor al cancelar la inscripción' },
      { status: 500 }
    );
  }
}
