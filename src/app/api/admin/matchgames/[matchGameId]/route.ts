import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTransaction } from '@/lib/transactionLogger';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ matchGameId: string }> }
) {
  try {
    const { matchGameId } = await params;

    console.log(`\n🗑️ ELIMINAR PARTIDA: ${matchGameId}`);

    // Obtener la partida con sus reservas
    const matchGame = await prisma.matchGame.findUnique({
      where: { id: matchGameId },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      }
    });

    if (!matchGame) {
      return NextResponse.json(
        { error: 'Partida no encontrada' },
        { status: 404 }
      );
    }

    console.log(`📊 Reservas activas: ${matchGame.bookings.length}`);

    // Devolver créditos/puntos a todos los jugadores
    for (const booking of matchGame.bookings) {
      const amountBlocked = Number(booking.amountBlocked);
      const pointsBlocked = Number(booking.pointsUsed || 0);
      const isPaidWithPoints = booking.paidWithPoints;

      console.log(`💰 Devolviendo fondos a usuario ${booking.userId}`);

      if (booking.status === 'CONFIRMED') {
        // Créditos/puntos ya están desbloqueados y confirmados - devolver directamente
        if (isPaidWithPoints) {
          await prisma.user.update({
            where: { id: booking.userId },
            data: { points: { increment: pointsBlocked } }
          });

          await createTransaction({
            userId: booking.userId,
            type: 'points',
            action: 'credit',
            amount: pointsBlocked,
            concept: `Reembolso por cancelación de partida ${matchGameId}`,
            relatedId: booking.id,
            relatedType: 'matchGameBooking'
          });
        } else {
          await prisma.user.update({
            where: { id: booking.userId },
            data: { credits: { increment: amountBlocked } }
          });

          await createTransaction({
            userId: booking.userId,
            type: 'credit',
            action: 'credit',
            amount: amountBlocked / 100,
            concept: `Reembolso por cancelación de partida ${matchGameId}`,
            relatedId: booking.id,
            relatedType: 'matchGameBooking'
          });
        }
      } else {
        // PENDING - solo desbloquear
        if (isPaidWithPoints) {
          await prisma.user.update({
            where: { id: booking.userId },
            data: { blockedPoints: { decrement: pointsBlocked } }
          });
        } else {
          await prisma.user.update({
            where: { id: booking.userId },
            data: { blockedCredits: { decrement: amountBlocked } }
          });
        }
      }

      // Cancelar la reserva
      await prisma.matchGameBooking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' }
      });
    }

    // Eliminar la partida
    await prisma.matchGame.delete({
      where: { id: matchGameId }
    });

    console.log(`✅ Partida eliminada correctamente`);

    return NextResponse.json({
      success: true,
      message: 'Partida eliminada y créditos devueltos',
      refundedBookings: matchGame.bookings.length
    });

  } catch (error) {
    console.error('❌ Error al eliminar partida:', error);
    return NextResponse.json(
      { 
        error: 'Error al eliminar partida',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
