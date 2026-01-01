import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to count actual player slots (handles private bookings)
function countPlayerSlots(bookings: any[]): number {
  let totalSlots = 0;
  for (const booking of bookings) {
    // Check if it's a private booking (amountBlocked > 1000 = 32€ = 4 slots)
    if (booking.amountBlocked && booking.amountBlocked > 1000) {
      totalSlots += 4; // Private booking = 4 slots
    } else {
      totalSlots += 1; // Individual booking = 1 slot
    }
  }
  return totalSlots;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    
    // Si no se pasa startDate, usar hoy a las 00:00 en formato que SQLite entienda
    let startDate = searchParams.get('startDate');
    if (!startDate) {
      // Obtener fecha de HOY en formato YYYY-MM-DD 00:00:00
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      // Crear ISO string manualmente en UTC correspondiente a las 00:00 local
      // Si estamos en UTC+1, las 00:00 local son 23:00 UTC del día anterior
      const localMidnight = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
      startDate = localMidnight.toISOString();
    }
    
    // Si no se pasa endDate, usar 30 días después  
    let endDate = searchParams.get('endDate');
    if (!endDate) {
      const start = new Date(startDate);
      const future = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      endDate = future.toISOString();
    }

    // 1. Obtener información del club (incluyendo openingHours)
    const club = clubId ? await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        logo: true,
        openingHours: true
      }
    }) : null;

    // 2. Obtener todas las pistas del club
    const courts = await prisma.court.findMany({
      where: clubId ? { clubId, isActive: true } : { isActive: true },
      select: {
        id: true,
        number: true,
        name: true,
        club: {
          select: { name: true, logo: true }
        }
      },
      orderBy: { number: 'asc' }
    });

    // 3. Obtener instructores del club
    const instructors = await prisma.instructor.findMany({
      where: clubId ? { clubId, isActive: true } : { isActive: true },
      select: {
        id: true,
        hourlyRate: true,
        specialties: true,
        user: {
          select: {
            name: true,
            email: true,
            profilePictureUrl: true
          }
        }
      }
    });

    // 4. Obtener clases (TimeSlots) en el rango de fechas - OPTIMIZADO
    const adjustedStartDate = new Date(startDate);
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    const startTime = adjustedStartDate.getTime();
    const endTime = adjustedEndDate.getTime();
    
    // Query optimizada: filtrar en SQL en lugar de traer todo
    const classesRaw = await prisma.$queryRaw`
      SELECT 
        id, start, end, maxPlayers, totalPrice, level, category, 
        levelRange,
        courtId, courtNumber, instructorId, clubId
      FROM TimeSlot
      WHERE start >= ${startTime} AND start <= ${endTime}
      ORDER BY start ASC
    ` as any[];
    
    const classesInRange = classesRaw;

    // Obtener todos los IDs de TimeSlots e Instructores para queries optimizadas
    const timeSlotIds = classesInRange.map((c: any) => c.id);
    const instructorIds = [...new Set(classesInRange.map((c: any) => c.instructorId).filter(Boolean))];

    console.log('🔍 Loading data for:', timeSlotIds.length, 'timeslots and', instructorIds.length, 'instructors');

    // Cargar TODOS los instructores de las clases en una query
    const classInstructors = await prisma.instructor.findMany({
      where: { id: { in: instructorIds } },
      include: {
        user: {
          select: {
            name: true,
            profilePictureUrl: true
          }
        }
      }
    });

    const instructorMap = new Map(classInstructors.map(i => [i.id, i]));

    // Cargar TODOS los bookings en una query (incluye CANCELLED para mostrar en calendario)
    const allBookings = await prisma.booking.findMany({
      where: {
        timeSlotId: { in: timeSlotIds },
        status: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] } // ✅ Incluir CANCELLED
      },
      select: {
        id: true,
        userId: true,
        timeSlotId: true,
        status: true,
        groupSize: true, // ⭐ EXPLICITLY SELECT groupSize
        isRecycled: true, // ♻️ Campo para detectar plazas recicladas
        user: {
          select: {
            name: true,
            profilePictureUrl: true
          }
        }
      }
    });

    // Agrupar bookings por timeSlotId
    const bookingsBySlot = new Map<string, any[]>();
    allBookings.forEach(b => {
      if (!bookingsBySlot.has(b.timeSlotId)) {
        bookingsBySlot.set(b.timeSlotId, []);
      }
      bookingsBySlot.get(b.timeSlotId)!.push(b);
    });

    // Combinar datos
    const classes = classesInRange.map((timeSlot: any) => {
      return {
        ...timeSlot,
        instructor: instructorMap.get(timeSlot.instructorId) || null,
        bookings: bookingsBySlot.get(timeSlot.id) || []
      };
    });

    // 4. Obtener partidas (MatchGames)
    const matchGames = await prisma.matchGame.findMany({
      where: {
        ...(clubId && { clubId }),
        start: { 
          gte: new Date(startTime),
          lte: new Date(endTime)
        }
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] }
          },
          select: {
            id: true,
            userId: true,
            status: true,
            user: {
              select: {
                name: true,
                profilePictureUrl: true
              }
            }
          }
        }
      },
      orderBy: { start: 'asc' }
    });

    // Separar clases propuestas de confirmadas
    const proposedClasses = classes.filter((c: any) => c.courtId === null);
    const confirmedClasses = classes.filter((c: any) => c.courtId !== null);

    // Separar partidas propuestas de confirmadas
    const proposedMatches = matchGames.filter((m: any) => m.courtNumber === null);
    const confirmedMatches = matchGames.filter((m: any) => m.courtNumber !== null);

    // Construir respuesta simplificada
    const calendarData = {
      courts: courts.map(court => ({
        id: court.id,
        number: court.number,
        name: court.name || `Pista ${court.number}`,
        clubName: court.club?.name,
        clubLogo: court.club?.logo
      })),
      instructors: instructors.map(instructor => ({
        id: instructor.id,
        name: instructor.user.name,
        email: instructor.user.email,
        photo: instructor.user.profilePictureUrl,
        hourlyRate: instructor.hourlyRate,
        specialties: instructor.specialties
      })),
      // Nueva estructura: separar propuestas de confirmadas
      proposedClasses: proposedClasses.map((cls: any) => {
        // Calcular total de jugadores inscritos en bookings PENDING (participantes de la carrera)
        // En clases propuestas (sin pista asignada), solo contamos PENDING
        const pendingBookings = cls.bookings?.filter((b: any) => b.status === 'PENDING') || [];
        const totalPlayers = pendingBookings.reduce((sum: number, b: any) => sum + (b.groupSize || 1), 0);
        
        return {
          id: `class-${cls.id}`,
          type: 'class-proposal',
          title: `${cls.level} (${totalPlayers}/${cls.maxPlayers})`,
          start: cls.start.toISOString(),
          end: cls.end.toISOString(),
          instructorId: cls.instructor?.id,
          instructorName: cls.instructor?.user?.name,
          instructorPhoto: cls.instructor?.user?.profilePictureUrl,
          level: cls.level,
          category: cls.category,
          levelRange: cls.levelRange,
          price: cls.totalPrice,
          playersCount: totalPlayers, // Total de jugadores inscritos (PENDING)
          maxPlayers: cls.maxPlayers,
          availableSpots: cls.maxPlayers - totalPlayers,
          bookings: cls.bookings,
          color: '#FFA500' // Naranja para propuestas
        };
      }),
      confirmedClasses: confirmedClasses.map((cls: any) => {
        // Calcular el groupSize real de la clase confirmada (suma de groupSize de bookings CONFIRMED)
        const confirmedBookings = cls.bookings?.filter((b: any) => b.status === 'CONFIRMED') || [];
        const actualGroupSize = confirmedBookings.reduce((sum: number, b: any) => sum + (b.groupSize || 1), 0);
        
        return {
          id: `class-${cls.id}`,
          type: 'class-confirmed',
          title: `${cls.level} - Pista ${cls.courtNumber}`,
          start: cls.start.toISOString(),
          end: cls.end.toISOString(),
          courtNumber: cls.courtNumber,
          instructorId: cls.instructor?.id,
          instructorName: cls.instructor?.user?.name,
          instructorPhoto: cls.instructor?.user?.profilePictureUrl,
          level: cls.level,
          category: cls.category,
          levelRange: cls.levelRange,
          price: cls.totalPrice,
          playersCount: actualGroupSize, // Total de jugadores confirmados
          maxPlayers: actualGroupSize, // Capacidad = jugadores confirmados
          availableSpots: 0, // No hay espacios disponibles en clases confirmadas
          bookings: cls.bookings,
          color: '#10B981' // Verde para confirmadas
        };
      }),
      proposedMatches: proposedMatches.map((match: any) => {
        const confirmedBookings = match.bookings?.filter((b: any) => b.status === 'CONFIRMED') || [];
        const pendingBookings = match.bookings?.filter((b: any) => b.status === 'PENDING') || [];
        const totalPlayers = countPlayerSlots(confirmedBookings) + countPlayerSlots(pendingBookings);
        
        return {
          id: `match-${match.id}`,
          type: 'match-proposal',
          title: `Partida ${match.isOpen ? 'Abierta' : 'Clasificada'} (${totalPlayers}/4)`,
          start: new Date(match.start).toISOString(),
          end: new Date(match.end).toISOString(),
          level: match.level,
          isOpen: match.isOpen,
          genderCategory: match.genderCategory,
          playersCount: totalPlayers,
          maxPlayers: 4,
          availableSpots: 4 - totalPlayers,
          bookings: match.bookings,
          color: '#9333EA' // Morado para partidas propuestas
        };
      }),
      confirmedMatches: confirmedMatches.map((match: any) => {
        const confirmedBookings = match.bookings?.filter((b: any) => b.status === 'CONFIRMED') || [];
        const totalPlayers = countPlayerSlots(confirmedBookings);
        
        return {
          id: `match-${match.id}`,
          type: 'match-confirmed',
          title: `Partida - Pista ${match.courtNumber}`,
          start: new Date(match.start).toISOString(),
          end: new Date(match.end).toISOString(),
          courtNumber: match.courtNumber,
          level: match.level,
          isOpen: match.isOpen,
          genderCategory: match.genderCategory,
          playersCount: totalPlayers,
          maxPlayers: 4,
          availableSpots: 0,
          bookings: match.bookings,
          color: '#7C3AED' // Morado oscuro para partidas confirmadas
        };
      }),
      events: [
        // Clases (TimeSlots) - mantener por compatibilidad
        ...classes.map((cls: any) => {
          const hasCourtAssigned = cls.courtNumber !== null;
          const bookingsCount = cls.bookings?.length || 0;
          const availableSpots = cls.maxPlayers - bookingsCount;
          
          return {
            id: `class-${cls.id}`,
            type: hasCourtAssigned ? 'class-confirmed' : 'class-proposal',
            title: hasCourtAssigned 
              ? `${cls.level} - Pista ${cls.courtNumber} (${bookingsCount}/${cls.maxPlayers})`
              : `${cls.level} - Sin pista (${bookingsCount}/${cls.maxPlayers})`,
            start: cls.start.toISOString(),
            end: cls.end.toISOString(),
            courtNumber: cls.courtNumber,
            instructorId: cls.instructor?.id,
            instructorName: cls.instructor?.user?.name,
            instructorPhoto: cls.instructor?.user?.profilePictureUrl,
            level: cls.level,
            category: cls.category,
            price: cls.totalPrice,
            playersCount: bookingsCount,
            maxPlayers: cls.maxPlayers,
            availableSpots,
            bookings: cls.bookings,
            resourceId: hasCourtAssigned ? `court-${cls.courtNumber}` : `instructor-${cls.instructor?.id}`,
            color: hasCourtAssigned ? '#10B981' : '#FFA500', // Verde confirmada, Naranja propuesta
            status: bookingsCount === 0 ? 'empty' : bookingsCount >= cls.maxPlayers ? 'full' : 'available'
          };
        }),
        
        // Partidas (MatchGames)
        ...matchGames.map((match: any) => {
          const confirmedBookings = match.bookings?.filter((b: any) => b.status === 'CONFIRMED') || [];
          const pendingBookings = match.bookings?.filter((b: any) => b.status === 'PENDING') || [];
          const totalPlayers = countPlayerSlots(confirmedBookings) + countPlayerSlots(pendingBookings);
          
          return {
            id: `match-${match.id}`,
            type: 'match',
            title: `Partida ${match.isOpen ? 'Abierta' : 'Clasificada'} (${totalPlayers}/4)${match.courtNumber ? ` - Pista ${match.courtNumber}` : ''}`,
            start: new Date(match.start).toISOString(),
            end: new Date(match.end).toISOString(),
            courtId: match.courtId,
            courtNumber: match.courtNumber,
            level: match.level,
            isOpen: match.isOpen,
            genderCategory: match.genderCategory,
            playersCount: totalPlayers,
            maxPlayers: 4,
            availableSpots: 4 - totalPlayers,
            bookings: match.bookings,
            resourceId: match.courtNumber ? `court-${match.courtNumber}` : `match-${match.id}`,
            color: '#9333EA' // Morado para partidas (matches del sistema de competición)
          };
        })
      ],
      summary: {
        totalCourts: courts.length,
        totalInstructors: instructors.length,
        totalClasses: classes.length,
        confirmedClasses: confirmedClasses.length,
        proposedClasses: proposedClasses.length,
        totalMatches: matchGames.length,
        confirmedMatches: confirmedMatches.length,
        proposedMatches: proposedMatches.length,
        emptyClasses: classes.filter((c: any) => (c.bookings?.length || 0) === 0).length,
        fullClasses: classes.filter((c: any) => (c.bookings?.length || 0) >= c.maxPlayers).length
      },
      club: club ? {
        id: club.id,
        name: club.name,
        logo: club.logo,
        openingHours: club.openingHours
      } : null
    };

    console.log('✅ Calendar data built successfully');

    // Desactivar cache para que los navegadores siempre obtengan datos frescos
    return NextResponse.json(calendarData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching calendar data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch calendar data',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
