import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

        console.log('📅 Step 1: Fetching calendar data:', {
      clubId,
      startDate,
      endDate
    });
    console.log('🔧 Calendar API v2 - Sin filtro clubId');

    // 1. Obtener todas las pistas del club
    const courts = await prisma.court.findMany({
      where: clubId ? { clubId, isActive: true } : { isActive: true },
      include: {
        club: {
          select: { name: true }
        }
      },
      orderBy: { number: 'asc' }
    });
    
    console.log('📅 Step 2: Courts fetched:', courts.length);

    // 2. Obtener instructores del club
    const instructors = await prisma.instructor.findMany({
      where: clubId ? { clubId, isActive: true } : { isActive: true },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profilePictureUrl: true
          }
        }
      }
    });

    console.log('📅 Step 3: Instructors fetched:', instructors.length);

    // 3. Obtener clases (TimeSlots) en el rango de fechas
    // USANDO SQL DIRECTO porque Prisma ORM tiene problemas con DateTime en SQLite
    const adjustedStartDate = new Date(startDate);
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    // SQLite guarda fechas como TEXT (ISO strings), así que comparamos como strings
    const startISO = adjustedStartDate.toISOString();
    const endISO = adjustedEndDate.toISOString();
    
    console.log('🔍 Querying TimeSlots between:', startISO, 'and', endISO);
    console.log('   startDate original:', startDate);
    console.log('   adjustedStartDate:', adjustedStartDate);
    console.log('   startISO:', startISO);
    
    // 🔧 FIX: SQLite almacena fechas como objetos, no como strings
    // Obtener TODAS las clases y filtrar en JavaScript
    const classesRaw = await prisma.$queryRaw`
      SELECT 
        id, start, end, maxPlayers, totalPrice, level, category, 
        courtId, courtNumber, instructorId, clubId
      FROM TimeSlot
      ORDER BY start ASC
    ` as any[];

    console.log('🔍 SQL Query returned:', classesRaw.length, 'total classes');
    
    // Filtrar por rango de fechas en JavaScript
    const startTime = adjustedStartDate.getTime();
    const endTime = adjustedEndDate.getTime();
    
    const classesInRange = classesRaw.filter((c: any) => {
      const classTime = new Date(c.start).getTime();
      return classTime >= startTime && classTime <= endTime;
    });
    
    console.log('🔍 Classes in date range:', classesInRange.length);
    if (classesInRange.length > 0) {
      const firstSlot = classesInRange[0];
      const firstDate = new Date(firstSlot.start);
      console.log('   First slot:', firstDate.toLocaleString('es-ES'));
    }
    console.log('   With courtId=null:', classesInRange.filter((c: any) => c.courtId === null).length);
    console.log('   With courtId!=null:', classesInRange.filter((c: any) => c.courtId !== null).length);

    // Obtener datos de instructor y bookings por separado
    const classes = await Promise.all(classesInRange.map(async (timeSlot: any) => {
      const [instructor, bookings] = await Promise.all([
        timeSlot.instructorId ? prisma.instructor.findUnique({
          where: { id: timeSlot.instructorId },
          include: {
            user: {
              select: {
                name: true,
                profilePictureUrl: true
              }
            }
          }
        }) : null,
        prisma.booking.findMany({
          where: { 
            timeSlotId: timeSlot.id,
            status: { 
              in: ['PENDING', 'CONFIRMED'] // Excluir CANCELLED
            }
          },
          include: {
            user: {
              select: {
                name: true,
                profilePictureUrl: true
              }
            }
          }
        })
      ]);

      return {
        ...timeSlot,
        instructor,
        bookings
      };
    }));

    console.log('📅 Step 4: Classes fetched:', classes.length);

    // 4. Obtener partidas
    const matches = await prisma.match.findMany({
      where: {
        ...(clubId && { 
          court: {
            clubId: clubId
          }
        }),
        startTime: { 
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        court: true
      },
      orderBy: { startTime: 'asc' }
    });

    console.log('📅 Step 5: Matches fetched:', matches.length);

    // Separar clases propuestas de confirmadas
    const proposedClasses = classes.filter((c: any) => c.courtId === null);
    const confirmedClasses = classes.filter((c: any) => c.courtId !== null);

    // Construir respuesta simplificada
    const calendarData = {
      courts: courts.map(court => ({
        id: court.id,
        number: court.number,
        name: court.name || `Pista ${court.number}`,
        clubName: court.club?.name
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
        const bookingsCount = cls.bookings?.length || 0;
        return {
          id: `class-${cls.id}`,
          type: 'class-proposal',
          title: `${cls.level} (${bookingsCount}/${cls.maxPlayers})`,
          start: cls.start.toISOString(),
          end: cls.end.toISOString(),
          instructorId: cls.instructor?.id,
          instructorName: cls.instructor?.user?.name,
          instructorPhoto: cls.instructor?.user?.profilePictureUrl,
          level: cls.level,
          category: cls.category,
          price: cls.totalPrice,
          playersCount: bookingsCount,
          maxPlayers: cls.maxPlayers,
          availableSpots: cls.maxPlayers - bookingsCount,
          bookings: cls.bookings,
          color: '#FFA500' // Naranja para propuestas
        };
      }),
      confirmedClasses: confirmedClasses.map((cls: any) => {
        const bookingsCount = cls.bookings?.length || 0;
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
          price: cls.totalPrice,
          playersCount: bookingsCount,
          maxPlayers: cls.maxPlayers,
          availableSpots: cls.maxPlayers - bookingsCount,
          bookings: cls.bookings,
          color: '#10B981' // Verde para confirmadas
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
        
        // Partidas (Matches)
        ...matches.map((match: any) => ({
          id: `match-${match.id}`,
          type: 'match',
          title: `Partido - Pista ${match.court?.number || 'N/A'}`,
          start: match.startTime.toISOString(),
          end: match.endTime.toISOString(),
          courtId: match.courtId,
          courtNumber: match.court?.number,
          courtName: match.court?.name,
          status: match.status,
          resourceId: `court-${match.court?.number}`,
          color: '#3B82F6' // Azul para partidas
        }))
      ],
      summary: {
        totalCourts: courts.length,
        totalInstructors: instructors.length,
        totalClasses: classes.length,
        confirmedClasses: confirmedClasses.length,
        proposedClasses: proposedClasses.length,
        totalMatches: matches.length,
        emptyClasses: classes.filter((c: any) => (c.bookings?.length || 0) === 0).length,
        fullClasses: classes.filter((c: any) => (c.bookings?.length || 0) >= c.maxPlayers).length
      }
    };

    console.log('✅ Calendar data built successfully');

    return NextResponse.json(calendarData);

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
