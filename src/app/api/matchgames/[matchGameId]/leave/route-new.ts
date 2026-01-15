import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTransaction } from '@/lib/transactionLogger';
import { grantCompensationPoints } from '@/lib/blockedCredits';

export async function POST(
  request: Request,
  { params }: { params: { matchGameId: string } }
) {
  try {
    const { userId } = await request.json();
    const { matchGameId } = params;

    console.log('\n🚪 === CESIÓN DE PLAZA EN PARTIDA ===');
    console.log('📝 Datos:', { matchGameId, userId });

    if (!userId) {
      return NextResponse.json(
        { error: 'Falta userId' },
        { status: 400 }
      );
    }

    // Buscar el booking del usuario
    const booking = await prisma.matchGameBooking.findFirst({
      where: {
        matchGameId,
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            credits: true,
            points: true,
            blockedCredits: true,
            blockedPoints: true
          }
        },
        matchGame: {
          select: {
            id: true,
            start: true,
            courtNumber: true,
            price: true,
            bookings: {
              where: { status: { not: 'CANCELLED' } },
              select: { id: true, userId: true, status: true }
            }
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'No se encontró tu inscripción en esta partida' },
        { status: 404 }
      );
    }

    console.log(`📋 Booking encontrado: ${booking.id} - Status: ${booking.status}`);

    // 🔍 DETERMINAR SI ES CESIÓN DE PLAZA (CONFIRMADA) O CANCELACIÓN SIMPLE (PENDIENTE)
    const isConfirmed = booking.status === 'CONFIRMED' && booking.matchGame.courtNumber !== null;
    const pricePerPlayer = Number(booking.matchGame.price) || 0;

    console.log(`📊 Estado: ${isConfirmed ? 'CONFIRMADA (cesión de plaza)' : 'PENDIENTE (cancelación simple)'}`);
    console.log(`💰 Precio por jugador: €${pricePerPlayer}`);

    let refundMessage = '';

    if (isConfirmed) {
      // ♻️ CESIÓN DE PLAZA → Otorgar PUNTOS de compensación (1 punto por euro)
      console.log(`♻️ Partida confirmada - Cediendo plaza y otorgando PUNTOS`);

      const pointsGranted = Math.floor(pricePerPlayer);
      const newPoints = await grantCompensationPoints(userId, pricePerPlayer, true);

      console.log(`✅ Otorgados ${pointsGranted} puntos (de €${pricePerPlayer.toFixed(2)}). Total puntos: ${newPoints}`);

      // Registrar transacción de puntos
      await createTransaction({
        userId: userId,
        type: 'points',
        action: 'add',
        amount: pointsGranted,
        balance: newPoints,
        concept: `Cesión de plaza - Partida ${new Date(booking.matchGame.start).toLocaleString('es-ES')}`,
        relatedId: booking.id,
        relatedType: 'matchGameBooking',
        metadata: {
          matchGameId: matchGameId,
          reason: 'Cesión de plaza confirmada',
          originalAmount: pricePerPlayer
        }
      });

      // ♻️ MARCAR LA PLAZA COMO RECICLADA (disponible solo con puntos)
      await prisma.matchGameBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          wasConfirmed: true, // Recordar que tenía pista asignada
          isRecycled: true // Marcar como plaza reciclada
        }
      });

      console.log(`♻️ Plaza marcada como RECICLADA: solo reservable con puntos`);
      console.log(`🏟️ Partida mantiene pista ${booking.matchGame.courtNumber} asignada`);

      refundMessage = `${pointsGranted} puntos otorgados. Plaza cedida disponible para otros jugadores (solo puntos)`;

    } else {
      // 💳 CANCELACIÓN DE INSCRIPCIÓN PENDIENTE → Desbloquear fondos
      console.log(`💰 Inscripción pendiente - Desbloqueando fondos`);

      if (booking.paidWithPoints) {
        // Desbloquear puntos
        await prisma.user.update({
          where: { id: userId },
          data: { blockedPoints: { decrement: booking.pointsUsed } }
        });

        await createTransaction({
          userId,
          type: 'points',
          action: 'unblock',
          amount: booking.pointsUsed,
          concept: `Cancelación de inscripción - Partida ${matchGameId}`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });

        console.log(`🔓 Puntos desbloqueados: ${booking.pointsUsed}`);
        refundMessage = `${booking.pointsUsed} puntos desbloqueados`;

      } else {
        // Desbloquear créditos (usando recalculación)
        // Primero marcamos la inscripción como CANCELLED (se hará más abajo)
        // Pero para que updateUserBlockedCredits funcione, el estado en BD debe estar actualizado.
        // Así que primero actualizamos el status del booking actual y luego recalculamos.

        await prisma.matchGameBooking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            wasConfirmed: false,
            isRecycled: false
          }
        });

        const creditsInEuros = booking.amountBlocked / 100;
        await updateUserBlockedCredits(userId);

        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: booking.amountBlocked,
          concept: `Cancelación de inscripción - Partida ${matchGameId}`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });

        console.log(`🔓 Créditos desbloqueados: €${creditsInEuros}`);
        refundMessage = `€${creditsInEuros.toFixed(2)} desbloqueados`;
      }

      console.log(`✅ Inscripción cancelada y saldo recalculado`);

      console.log(`✅ Inscripción cancelada (no era confirmada)`);
    }

    // 🔍 VERIFICAR SI QUEDAN PLAZAS ACTIVAS O RECICLADAS
    const remainingActiveBookings = await prisma.matchGameBooking.count({
      where: {
        matchGameId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    const recycledBookings = await prisma.matchGameBooking.count({
      where: {
        matchGameId,
        status: 'CANCELLED',
        isRecycled: true
      }
    });

    const totalPlayers = 4; // Las partidas siempre son de 4 jugadores
    const occupiedSpots = remainingActiveBookings;
    const availableRecycledSpots = totalPlayers - occupiedSpots;

    console.log(`📊 Estado de la partida:`);
    console.log(`   - Capacidad total: ${totalPlayers} jugadores`);
    console.log(`   - Inscripciones activas: ${remainingActiveBookings}`);
    console.log(`   - Plazas recicladas: ${recycledBookings}`);
    console.log(`   - Plazas disponibles para reciclar: ${availableRecycledSpots}`);

    // ♻️ LA PISTA SIEMPRE MANTIENE EL courtNumber MIENTRAS HAYA PLAZAS (activas o recicladas)
    // Solo se libera si la partida queda completamente vacía
    if (remainingActiveBookings === 0 && recycledBookings === 0) {
      console.log('🔓 Partida completamente vacía - Liberando MatchGame...');

      try {
        await prisma.matchGame.update({
          where: { id: matchGameId },
          data: {
            courtId: null,
            courtNumber: null
          }
        });
        console.log('✅ MatchGame liberado completamente');
      } catch (cleanupError) {
        console.error('❌ Error limpiando MatchGame:', cleanupError);
      }
    } else {
      console.log(`✅ Partida mantiene pista ${booking.matchGame.courtNumber || 'asignada'}`);
      if (recycledBookings > 0) {
        console.log(`   ♻️ ${recycledBookings} plaza(s) reciclada(s) disponible(s) SOLO CON PUNTOS`);
      }
    }

    return NextResponse.json({
      success: true,
      refunded: true,
      isRecycled: isConfirmed,
      message: refundMessage,
      remainingPlayers: remainingActiveBookings,
      recycledSlots: recycledBookings
    });

  } catch (error) {
    console.error('❌ Error en POST /api/matchgames/[matchGameId]/leave:', error);
    return NextResponse.json(
      { error: 'Error al ceder/cancelar la plaza', details: (error as Error).message },
      { status: 500 }
    );
  }
}
