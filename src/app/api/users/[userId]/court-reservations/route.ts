// src/app/api/users/[userId]/court-reservations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/[userId]/court-reservations
 * Obtener todas las reservas de pistas (CourtSchedule) de un usuario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Obtener todas las reservas de pistas del usuario
    // El formato del reason es: "user_court_reservation:{userId}:{duration}min"
    const allReservations = await prisma.courtSchedule.findMany({
      where: {
        reason: {
          startsWith: `user_court_reservation:${userId}:`
        }
      },
      include: {
        court: {
          include: {
            club: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // Obtener transacciones relacionadas para saber el precio
    const reservationIds = allReservations.map((r: any) => r.id);
    const transactions = await prisma.transaction.findMany({
      where: {
        relatedId: { in: reservationIds },
        relatedType: 'court_reservation',
        type: 'credit',
        action: 'subtract'
      }
    });

    // Crear mapa de precios
    const priceMap = new Map();
    transactions.forEach(t => {
      if (t.relatedId) {
        priceMap.set(t.relatedId, t.amount / 100);
      }
    });

    // Transformar las reservas al formato esperado
    const courtReservations = allReservations.map((reservation: any) => {
      // Extraer duración del reason
      const durationMatch = reservation.reason?.match(/:(\d+)min$/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 60;

      const price = priceMap.get(reservation.id) || 0;

      return {
        id: reservation.id,
        type: 'court-reservation',
        start: reservation.startTime.getTime(),
        end: reservation.endTime.getTime(),
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        duration,
        price,
        status: new Date(reservation.endTime) < new Date() ? 'COMPLETED' : 'CONFIRMED',
        courtId: reservation.courtId,
        courtNumber: reservation.court.number,
        courtName: reservation.court.name,
        clubId: reservation.court.clubId,
        clubName: reservation.court.club.name,
        userId: userId,
        createdAt: reservation.createdAt,
      };
    });

    console.log(`✅ Cargadas ${courtReservations.length} reservas de pistas para usuario ${userId}`);

    return NextResponse.json(courtReservations);
  } catch (error) {
    console.error('❌ Error al obtener reservas de pistas:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener reservas de pistas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
