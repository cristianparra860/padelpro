import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const onlyConfirmed = searchParams.get('onlyConfirmed') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      );
    }

    // Crear rango de fechas para el día especificado
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    console.log(`🔍 Verificando bookings para usuario ${userId} el ${date}`);
    console.log(`📅 Rango: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

    // Query para obtener bookings del usuario en ese día
    const whereClause: any = {
      userId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      timeSlot: {
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    };

    // Si solo queremos confirmadas, añadir filtro de courtId
    if (onlyConfirmed) {
      whereClause.timeSlot.courtId = { not: null };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
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

    console.log(`✅ Encontrados ${bookings.length} bookings`);
    if (bookings.length > 0) {
      console.log(`📋 Primer booking:`, {
        id: bookings[0].id.substring(0, 15),
        status: bookings[0].status,
        courtId: bookings[0].timeSlot.courtId,
        courtNumber: bookings[0].timeSlot.court?.number
      });
    }

    return NextResponse.json({
      bookings,
      count: bookings.length,
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
