import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');

    if (!clubId) {
      return NextResponse.json(
        { error: 'clubId es requerido' },
        { status: 400 }
      );
    }

    let whereConditions: any = { clubId };

    if (date) {
      // Crear rango de fecha para el día completo
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');

      whereConditions.start = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    // Obtener todas las pistas del club para calcular disponibilidad
    const allCourts = await prisma.court.findMany({
      where: { clubId, isActive: true },
      select: { id: true, number: true },
      orderBy: { number: 'asc' }
    });

    // Obtener todas las partidas (propuestas y confirmadas)
    const matchGames = await prisma.matchGame.findMany({
      where: whereConditions,
      include: {
        bookings: {
          where: {
            OR: [
              { status: { in: ['PENDING', 'CONFIRMED'] } },
              { status: 'CANCELLED', isRecycled: true } // ♻️ Incluir plazas recicladas
            ]
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
                level: true,
                position: true
              }
            }
          }
        }
      },
      orderBy: { start: 'asc' }
    });

    // Obtener todas las partidas confirmadas (con pista asignada) para calcular ocupación
    const confirmedMatches = await prisma.matchGame.findMany({
      where: {
        clubId,
        courtNumber: { not: null },
        ...(date && {
          start: {
            gte: new Date(date + 'T00:00:00.000Z'),
            lte: new Date(date + 'T23:59:59.999Z')
          }
        })
      },
      select: {
        id: true,
        courtNumber: true,
        start: true,
        end: true
      }
    });

    // Obtener todas las CLASES confirmadas (con pista asignada) para calcular ocupación
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        clubId,
        courtNumber: { not: null },
        ...(date && {
          start: {
            gte: new Date(date + 'T00:00:00.000Z'),
            lte: new Date(date + 'T23:59:59.999Z')
          }
        })
      },
      select: {
        id: true,
        courtNumber: true,
        start: true,
        end: true
      }
    });

    // Obtener TODAS las reservas de pistas (bloqueos) para verificar ocupación
    const allBlockingSchedules = await prisma.courtSchedule.findMany({
      where: {
        ...(date && {
          startTime: {
            gte: new Date(date + 'T00:00:00.000Z'),
            lte: new Date(date + 'T23:59:59.999Z')
          }
        }),
        isOccupied: true,
        ...(clubId && { court: { clubId } })
      },
      select: {
        courtId: true,
        startTime: true,
        endTime: true
      }
    });

    // Enriquecer cada partida con información de disponibilidad de pistas
    const matchGamesWithAvailability = matchGames.map(match => {
      const matchStart = new Date(match.start).getTime();
      const matchEnd = new Date(match.end).getTime();

      // Calcular disponibilidad de cada pista para este horario
      const courtsAvailability = allCourts.map(court => {
        // 1. Verificar si hay PARTIDA en esta pista y horario
        const isMatchOccupied = confirmedMatches.some(confirmedMatch => {
          const confirmedStart = new Date(confirmedMatch.start).getTime();
          const confirmedEnd = new Date(confirmedMatch.end).getTime();

          const isSameCourt = confirmedMatch.courtNumber === court.number;
          const hasOverlap = matchStart < confirmedEnd && matchEnd > confirmedStart;

          return isSameCourt && hasOverlap;
        });

        // 2. Verificar si hay CLASE en esta pista y horario
        const isClassOccupied = confirmedClasses.some(confirmedClass => {
          const confirmedStart = new Date(confirmedClass.start).getTime();
          const confirmedEnd = new Date(confirmedClass.end).getTime();

          const isSameCourt = confirmedClass.courtNumber === court.number;
          const hasOverlap = matchStart < confirmedEnd && matchEnd > confirmedStart;

          return isSameCourt && hasOverlap;
        });

        // 3. Verificar si hay BLOQUEO (CourtSchedule) en esta pista y horario
        const isScheduleOccupied = allBlockingSchedules.some(schedule => {
          const scheduleStart = new Date(schedule.startTime).getTime();
          const scheduleEnd = new Date(schedule.endTime).getTime();

          const isSameCourt = schedule.courtId === court.id;
          const hasOverlap = matchStart < scheduleEnd && matchEnd > scheduleStart;

          return isSameCourt && hasOverlap;
        });

        const isOccupied = isMatchOccupied || isClassOccupied || isScheduleOccupied;

        return {
          courtNumber: court.number,
          courtId: court.id,
          status: isOccupied ? 'occupied' : 'available'
        };
      });

      return {
        ...match,
        courtsAvailability
      };
    });

    console.log(`🎾 GET /api/matchgames - Total partidas: ${matchGamesWithAvailability.length}`);
    const openMatches = matchGamesWithAvailability.filter(m => m.isOpen);
    const classifiedMatches = matchGamesWithAvailability.filter(m => !m.isOpen);
    console.log(`   - Partidas abiertas: ${openMatches.length}`);
    console.log(`   - Partidas clasificadas: ${classifiedMatches.length}`);

    if (openMatches.length > 0) {
      console.log(`   📋 Partidas abiertas:`, openMatches.map(m => ({
        id: m.id,
        hora: new Date(m.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        jugadores: m.bookings.length
      })));
    }

    // FILTRO DE DISPONIBILIDAD:
    // Eliminar propuestas de partida que no tienen ninguna pista disponible
    const visibleMatchGames = matchGamesWithAvailability.filter(match => {
      // 1. Si ya tiene pista asignada (confirmada), SIEMPRE mostrar
      if (match.courtNumber) return true;

      // 2. Si es una propuesta (sin pista), verificar si hay AL MENOS UNA pista disponible
      const hasAvailableCourt = match.courtsAvailability.some(c => c.status === 'available');

      if (!hasAvailableCourt) {
        console.log(`🚫 Ocultando propuesta ${match.id.substring(0, 8)} - No hay pistas disponibles`);
      }

      return hasAvailableCourt;
    });

    return NextResponse.json({
      success: true,
      matchGames: visibleMatchGames
    });
  } catch (error) {
    console.error('Error fetching match games:', error);
    return NextResponse.json(
      { error: 'Error al obtener las partidas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
