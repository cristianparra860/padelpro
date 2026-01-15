import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API para cancelar una partida desde el panel de administrador
 * - Cancela todos los bookings activos
 * - Devuelve puntos a los usuarios
 * - Cierra la partida (isOpen = false)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchGameId: string }> }
) {
  try {
    const { userId } = await request.json();
    const { matchGameId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es administrador del club
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clubId: true }
    });

    if (!user || user.role !== 'CLUB_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para cancelar esta partida' },
        { status: 403 }
      );
    }

    const matchGame = await prisma.matchGame.findUnique({
      where: { id: matchGameId }
    });

    if (!matchGame) {
      return NextResponse.json(
        { error: 'Partida no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el admin pertenece al mismo club que la partida
    if (matchGame.clubId !== user.clubId) {
      return NextResponse.json(
        { error: 'Solo puedes cancelar partidas de tu propio club' },
        { status: 403 }
      );
    }

    // Obtener todos los bookings activos
    const activeBookings = await prisma.matchGameBooking.findMany({
      where: {
        matchGameId,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      include: {
        user: true
      }
    });

    // Procesar cancelación en una transacción
    const result = await prisma.$transaction(async (tx) => {
      let totalRefunded = 0;
      const refunds: { userId: string; name: string; amount: number }[] = [];

      // Solo procesar devoluciones si hay bookings activos
      if (activeBookings.length > 0) {
        for (const booking of activeBookings) {
          const amountBlockedCents = booking.amountBlocked || 0;
          const pointsUsed = booking.pointsUsed || 0;
          const isPaidWithPoints = booking.paidWithPoints;
          const isConfirmed = booking.status === 'CONFIRMED';

          if (isConfirmed) {
            // == CONFIRMED (Pagado) -> REEMBOLSO + LOG ==
            if (isPaidWithPoints) {
              // Reembolsar Puntos
              const updatedUser = await tx.user.update({
                where: { id: booking.userId },
                data: { points: { increment: pointsUsed } },
                select: { points: true, blockedPoints: true }
              });

              // Registrar transacción de reembolso
              await tx.transaction.create({
                data: {
                  userId: booking.userId,
                  type: 'points',
                  action: 'refund',
                  amount: pointsUsed,
                  balance: updatedUser.points - updatedUser.blockedPoints,
                  concept: `Devolución por cancelación de partida (Admin) - ${new Date(matchGame.start).toLocaleDateString()}`,
                  relatedId: booking.id,
                  relatedType: 'matchGameBooking'
                }
              });

              totalRefunded += pointsUsed; // Asumimos reportar puntos
            } else {
              // Reembolsar Créditos
              const updatedUser = await tx.user.update({
                where: { id: booking.userId },
                data: { credits: { increment: amountBlockedCents } },
                select: { credits: true, blockedCredits: true }
              });

              // Registrar transacción de reembolso
              await tx.transaction.create({
                data: {
                  userId: booking.userId,
                  type: 'credit',
                  action: 'refund',
                  amount: amountBlockedCents,
                  balance: updatedUser.credits - updatedUser.blockedCredits,
                  concept: `Devolución por cancelación de partida (Admin) - ${new Date(matchGame.start).toLocaleDateString()}`,
                  relatedId: booking.id,
                  relatedType: 'matchGameBooking'
                }
              });

              totalRefunded += amountBlockedCents; // Cents
            }
          } else {
            // == PENDING (Bloqueado) -> DESBLOQUEO SILENCIOSO (SIN LOG) ==
            if (isPaidWithPoints) {
              // Desbloquear Puntos
              await tx.user.update({
                where: { id: booking.userId },
                data: { blockedPoints: { decrement: pointsUsed } }
              });
            } else {
              // Desbloquear Créditos
              await tx.user.update({
                where: { id: booking.userId },
                // Usar decrement directo del monto bloqueado. 
                // updateUserBlockedCredits podría ser más seguro pero estamos en transacción.
                data: { blockedCredits: { decrement: amountBlockedCents } }
              });
            }
          }

          // Cancelar el booking
          await tx.matchGameBooking.update({
            where: { id: booking.id },
            data: {
              status: 'CANCELLED',
              updatedAt: new Date()
            }
          });
        }
      }

      // Cerrar la partida
      await tx.matchGame.update({
        where: { id: matchGameId },
        data: {
          isOpen: false
        }
      });

      return { totalRefunded, refunds, cancelledBookings: activeBookings.length };
    });

    const message = result.cancelledBookings === 0
      ? 'Partida cerrada correctamente'
      : `Partida cancelada. ${result.cancelledBookings} reserva(s) cancelada(s) y puntos devueltos.`;

    return NextResponse.json({
      success: true,
      message,
      totalRefunded: result.totalRefunded,
      refunds: result.refunds
    });

  } catch (error) {
    console.error('Error al cancelar partida:', error);
    return NextResponse.json(
      { error: 'Error al cancelar la partida' },
      { status: 500 }
    );
  }
}
