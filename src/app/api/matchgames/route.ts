import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to count actual player slots (handles private bookings)
function countPlayerSlots(bookings: any[]): number {
  let totalSlots = 0;
  for (const booking of bookings) {
    // Check groupSize first (most reliable), then amountBlocked for legacy bookings
    if (booking.groupSize && booking.groupSize > 1) {
      totalSlots += booking.groupSize; // Use groupSize if present
    } else if (booking.amountBlocked && booking.amountBlocked > 1000) {
      totalSlots += 4; // Private booking (legacy detection) = 4 slots
    } else {
      totalSlots += 1; // Individual booking = 1 slot
    }
  }
  return totalSlots;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎾 MATCHGAMES API - WITH LEVEL & GENDER FILTERING + PAGINATION - v1.0');
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');
    const userLevel = searchParams.get('userLevel'); // Nivel del usuario para filtrado automático
    const userGender = searchParams.get('userGender'); // Género del usuario
    const timeSlotFilter = searchParams.get('timeSlotFilter'); // morning, midday, evening
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Mayor límite por defecto

    console.log('🔍 API Request params:', { clubId, date, userLevel, userGender, timeSlotFilter, page, limit });

    // Build filter conditions
    const whereConditions: any = {};
    
    if (clubId) {
      whereConditions.clubId = clubId;
    }
    
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      
      whereConditions.start = {
        gte: startOfDay,
        lte: endOfDay
      };
      
      console.log('📅 Date filter:', {
        date,
        startISO: startOfDay.toISOString(),
        endISO: endOfDay.toISOString()
      });
    }

    console.log('📝 Where conditions:', whereConditions);

    // Ejecutar query en Prisma
    let matchGames = await prisma.matchGame.findMany({
      where: whereConditions,
      orderBy: { start: 'asc' }
    });

    console.log(`📊 Found ${matchGames.length} match games with Prisma query`);

    // Obtener bookings de partidas para verificar estado
    const matchGameIds = matchGames.map(mg => mg.id);
    
    let allBookings: any[] = [];
    if (matchGameIds.length > 0) {
      allBookings = await prisma.matchGameBooking.findMany({
        where: {
          matchGameId: { in: matchGameIds },
          OR: [
            { status: { not: 'CANCELLED' } },
            { status: 'CANCELLED', isRecycled: true }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              level: true,
              gender: true,
              profilePictureUrl: true
            }
          }
        }
      });
      
      console.log(`📚 Total bookings cargados (activos + reciclados): ${allBookings.length}`);
    }

    // Aplicar filtros de nivel y género del usuario
    if (userLevel || userGender) {
      const userLevelNum = userLevel ? parseFloat(userLevel) : null;
      
      matchGames = matchGames.filter(mg => {
        // Si es partida abierta, siempre se muestra
        if (mg.isOpen) {
          return true;
        }

        // Si tiene nivel definido, verificar que el usuario esté en el rango
        if (mg.level && userLevelNum !== null) {
          const [minLevel, maxLevel] = mg.level.split('-').map(Number);
          if (userLevelNum < minLevel || userLevelNum > maxLevel) {
            return false;
          }
        }

        // Si tiene género definido, verificar compatibilidad
        if (mg.genderCategory && userGender) {
          if (mg.genderCategory !== 'mixto' && mg.genderCategory !== userGender) {
            return false;
          }
        }

        return true;
      });

      console.log(`🎯 After level/gender filtering: ${matchGames.length} match games`);
    }

    // Aplicar filtro de horario (timeSlotFilter)
    if (timeSlotFilter && timeSlotFilter !== 'all') {
      matchGames = matchGames.filter(mg => {
        const hour = new Date(mg.start).getHours();
        
        if (timeSlotFilter === 'morning') {
          return hour >= 6 && hour < 12;
        } else if (timeSlotFilter === 'midday') {
          return hour >= 12 && hour < 18;
        } else if (timeSlotFilter === 'evening') {
          return hour >= 18;
        }
        
        return true;
      });

      console.log(`⏰ After time filter (${timeSlotFilter}): ${matchGames.length} match games`);
    }

    // Obtener información del club
    const club = clubId ? await prisma.club.findUnique({
      where: { id: clubId }
    }) : null;

    // Obtener todas las pistas del club
    const courts = clubId ? await prisma.court.findMany({
      where: { clubId },
      orderBy: { number: 'asc' }
    }) : [];

    // Obtener clases confirmadas en las fechas de las partidas (para saber qué pistas están ocupadas)
    const confirmedClasses = date && clubId ? await prisma.timeSlot.findMany({
      where: {
        clubId,
        courtId: { not: null },
        start: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z')
        }
      },
      select: {
        courtId: true,
        start: true,
        end: true
      }
    }) : [];

    // Obtener partidas confirmadas (con pista asignada)
    const confirmedMatches = date && clubId ? await prisma.matchGame.findMany({
      where: {
        clubId,
        courtNumber: { not: null },
        start: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lte: new Date(date + 'T23:59:59.999Z')
        }
      },
      select: {
        courtId: true,
        start: true,
        end: true
      }
    }) : [];

    // Procesar cada partida
    const processedMatchGames = matchGames.map(mg => {
      const bookings = allBookings.filter(b => b.matchGameId === mg.id);
      
      // Calcular plazas recicladas
      const recycledBookings = bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled === true);
      const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
      const totalPlayers = 4; // Las partidas siempre son de 4 jugadores
      const availableRecycledSlots = Math.max(0, Math.min(recycledBookings.length, totalPlayers - activeBookings.length));
      const hasRecycledSlots = availableRecycledSlots > 0;
      
      // Calcular disponibilidad de pistas para esta partida
      const courtsAvailability = courts.map(court => {
        // Verificar si la pista está ocupada por una clase en este horario
        const isOccupiedByClass = confirmedClasses.some(cls => 
          cls.courtId === court.id &&
          new Date(cls.start).getTime() < new Date(mg.end).getTime() &&
          new Date(cls.end).getTime() > new Date(mg.start).getTime()
        );

        // Verificar si la pista está ocupada por otra partida en este horario
        const isOccupiedByMatch = confirmedMatches.some(match => 
          match.courtId === court.id &&
          new Date(match.start).getTime() < new Date(mg.end).getTime() &&
          new Date(match.end).getTime() > new Date(mg.start).getTime()
        );

        return {
          courtId: court.id,
          courtNumber: court.number,
          status: isOccupiedByClass || isOccupiedByMatch ? 'occupied' : 'available'
        };
      });
      
      return {
        ...mg,
        start: mg.start.toISOString(),
        end: mg.end.toISOString(),
        courtNumber: mg.courtNumber,
        bookedPlayers: countPlayerSlots(activeBookings),  // Count actual slots, not just bookings
        bookings: bookings.map(b => ({
          id: b.id,
          userId: b.user.id,
          status: b.status,
          isRecycled: b.isRecycled,
          name: b.user.name,
          userName: b.user.name,
          userEmail: b.user.email,
          userLevel: b.user.level,
          userGender: b.user.gender,
          profilePictureUrl: b.user.profilePictureUrl,
          createdAt: b.createdAt.toISOString()
        })),
        clubName: club?.name,
        pricePerPlayer: mg.pricePerPlayer,
        hasRecycledSlots: hasRecycledSlots,
        availableRecycledSlots: availableRecycledSlots,
        recycledSlotsOnlyPoints: true, // Las plazas recicladas siempre son solo con puntos
        creditsCost: mg.creditsCost,
        courtsAvailability // 🏟️ Agregar disponibilidad de pistas
      };
    });

    // Ordenar: partidas con actividad primero
    const sortedMatchGames = [
      ...processedMatchGames.filter(mg => mg.bookings.length > 0).sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
      ...processedMatchGames.filter(mg => mg.bookings.length === 0).sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      )
    ];

    console.log(`📊 Ordenamiento aplicado: ${sortedMatchGames.filter(mg => mg.bookings.length > 0).length} partidas con actividad primero`);

    // Aplicar paginación
    const totalMatchGames = sortedMatchGames.length;
    const totalPages = Math.ceil(totalMatchGames / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMatchGames = sortedMatchGames.slice(startIndex, endIndex);

    console.log(`📄 Pagination: Page ${page}/${totalPages}, showing ${paginatedMatchGames.length} of ${totalMatchGames} match games (${startIndex}-${endIndex})`);
    console.log(`✅ Returning paginated match games: ${paginatedMatchGames.length}`);

    return NextResponse.json({
      matchGames: paginatedMatchGames,
      pagination: {
        page,
        limit,
        total: totalMatchGames,
        totalPages
      }
    });

  } catch (error) {
    console.error('❌ Error en API matchgames:', error);
    return NextResponse.json(
      { error: 'Error al cargar partidas', details: (error as Error).message },
      { status: 500 }
    );
  }
}
