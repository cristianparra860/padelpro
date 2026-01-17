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
      // Penalización de 1 punto (en lugar de dinero)
      // NOTA: Los puntos se guardan multiplicados por 100 (como céntimos). 100 = 1 punto.
      console.log('🔓 Cancelación de partida PENDIENTE - Aplicando penalización de puntos...');

      const PENALTY_POINTS = 100;
      const refundAmount = amountBlocked; // Se devuelve todo el dinero bloqueado

      console.log(`💸 Penalización: ${PENALTY_POINTS / 100} punto(s)`);
      console.log(`💵 Devolución: €${(refundAmount / 100).toFixed(2)}`);

      let finalBalance = 0;

      await prisma.$transaction(async (tx) => {
        // MARCAR COMO CANCELADA
        await tx.matchGameBooking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });

        // 1. DESBLOQUEAR TODO EL SALDO RETENIDO
        await tx.user.update({
          where: { id: userId },
          data: {
            blockedCredits: { decrement: amountBlocked },
            points: { decrement: PENALTY_POINTS } // Cobrar puntos
          }
        });

        // 2. (Ya no cobramos creditos)
        const updatedUser = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true, points: true }
        });

        // 3. REGISTRAR PENALIZACIÓN DE PUNTOS
        await tx.transaction.create({
          data: {
            userId,
            type: 'points', // Cambiado a puntos
            action: 'deduct',
            amount: PENALTY_POINTS,
            balance: updatedUser?.points || 0,
            concept: `Penalización por cancelación - Partida ${new Date(matchStart).toLocaleString('es-ES')}`,
            relatedId: booking.id,
            relatedType: 'matchgame_booking',
            metadata: JSON.stringify({
              matchGameId,
              status: 'CANCELLED',
              reason: 'Penalización por cancelación de partida pendiente (Puntos)',
              originalBlocked: amountBlocked,
              penaltyPoints: PENALTY_POINTS
            })
          }
        });

        // 4. VERIFICAR SI LA PARTIDA QUEDÓ VACÍA Y ELIMINARLA
        const remainingBookings = await tx.matchGameBooking.count({
          where: {
            matchGameId: matchGameId,
            status: { in: ['CONFIRMED', 'PENDING'] }
          }
        });

        if (remainingBookings === 0) {
          console.log('🗑️ La partida ha quedado vacía. Eliminando...');
          await tx.matchGameBooking.deleteMany({
            where: { matchGameId: matchGameId }
          });
          await tx.matchGame.delete({
            where: { id: matchGameId }
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `Reserva cancelada. Penalización de ${PENALTY_POINTS / 100} punto aplicada. Se ha desbloqueado tu saldo.`,
        penaltyPoints: PENALTY_POINTS,
        refundAmount: refundAmount,
        pointsGranted: 0,
        slotMarkedAsRecycled: false,
        matchDeleted: true
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
