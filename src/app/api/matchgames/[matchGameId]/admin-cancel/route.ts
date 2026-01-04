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
          // Calcular el monto a devolver
          const amountBlockedCents = booking.amountBlocked || 0;
          // Convertir céntimos a puntos (1 punto = 1€ = 100 céntimos)
          const pointsToRefund = Math.round(amountBlockedCents / 100);
        
        if (pointsToRefund > 0) {
          // Devolver puntos al usuario
          await tx.user.update({
            where: { id: booking.userId },
            data: {
              credits: {
                increment: pointsToRefund
              }
            }
          });

          totalRefunded += pointsToRefund;
          refunds.push({
            userId: booking.userId,
            name: booking.user.name || 'Usuario',
            amount: pointsToRefund
          });
        }

        // Cancelar el booking
        await tx.matchGameBooking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED'
          }
        });

        // Obtener saldo actual del usuario
        const userBalance = await tx.user.findUnique({
          where: { id: booking.userId },
          select: { credits: true }
        });

        // Registrar la transacción de devolución
        await tx.transaction.create({
          data: {
            userId: booking.userId,
            type: 'points',
            action: 'add',
            amount: pointsToRefund,
            balance: (userBalance?.credits || 0) + pointsToRefund,
            concept: `Devolución por cancelación de partida - ${new Date(matchGame.start).toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`,
            relatedId: booking.id,
            relatedType: 'booking'
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
