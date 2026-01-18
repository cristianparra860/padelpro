import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const onlyConfirmed = searchParams.get('onlyConfirmed') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Determinar rango de fechas
    let startFilter: Date;
    let endFilter: Date;

    if (startDateParam && endDateParam) {
      // Rango explícito (para carga mensual)
      startFilter = new Date(startDateParam);
      endFilter = new Date(endDateParam);
    } else if (date) {
      // Día único (retrocompatibilidad)
      startFilter = new Date(date + 'T00:00:00.000Z');
      endFilter = new Date(date + 'T23:59:59.999Z');
    } else {
      return NextResponse.json(
        { error: 'date OR startDate+endDate is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Verificando bookings para usuario ${userId}`);
    console.log(`📅 Rango: ${startFilter.toISOString()} - ${endFilter.toISOString()}`);

    // 1️⃣ Query para obtener bookings de CLASES del usuario
    const whereClauseClasses: any = {
      userId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      timeSlot: {
        start: {
          gte: startFilter,
          lte: endFilter
        }
      }
    };

    if (onlyConfirmed) {
      whereClauseClasses.timeSlot.courtId = { not: null };
    }

    const classBookings = await prisma.booking.findMany({
      where: whereClauseClasses,
      include: {
        timeSlot: {
          select: {
            id: true,
            start: true,
            end: true,
            courtId: true,
            court: {
              select: {
                number: true,
                name: true
              }
            },
            instructor: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 2️⃣ Query para obtener bookings de PARTIDAS del usuario
    const whereClauseMatches: any = {
      userId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      matchGame: {
        start: {
          gte: startFilter,
          lte: endFilter
        }
      }
    };

    if (onlyConfirmed) {
      whereClauseMatches.matchGame.courtId = { not: null };
    }

    const matchBookings = await prisma.matchGameBooking.findMany({
      where: whereClauseMatches,
      include: {
        matchGame: {
          select: {
            id: true,
            start: true,
            end: true,
            courtId: true,
            court: {
              select: {
                number: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 3️⃣ Combinar ambos tipos en un formato unificado
    const allBookings = [
      ...classBookings.map((booking: any) => ({
        id: booking.id,
        userId: booking.userId,
        status: booking.status,
        groupSize: booking.groupSize,
        createdAt: booking.createdAt,
        timeSlotId: booking.timeSlotId,
        matchGameId: null,
        timeSlot: booking.timeSlot,
        matchGame: null,
        type: 'class'
      })),
      ...matchBookings.map((booking: any) => ({
        id: booking.id,
        userId: booking.userId,
        status: booking.status,
        groupSize: booking.groupSize,
        createdAt: booking.createdAt,
        timeSlotId: null,
        matchGameId: booking.matchGameId,
        timeSlot: null,
        matchGame: booking.matchGame,
        type: 'match'
      }))
    ];

    // Ordenar por fecha de creación
    allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`✅ Encontrados ${classBookings.length} bookings de clases`);
    console.log(`✅ Encontrados ${matchBookings.length} bookings de partidas`);
    console.log(`✅ Total: ${allBookings.length} bookings`);

    return NextResponse.json({
      bookings: allBookings,
      count: allBookings.length,
      classCount: classBookings.length,
      matchCount: matchBookings.length,
      date: date
    });

  } catch (error) {
    console.error('❌ Error en /api/user-bookings:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
