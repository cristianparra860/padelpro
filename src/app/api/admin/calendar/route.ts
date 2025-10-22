import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const startDate = searchParams.get('startDate') || new Date().toISOString();
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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
    // SQLite guarda fechas como integers (timestamps en milisegundos)
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setHours(0, 0, 0, 0);
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
    adjustedEndDate.setHours(23, 59, 59, 999);
    
    // Convertir a timestamps para comparación con integers en SQLite
    const startTimestamp = adjustedStartDate.getTime();
    const endTimestamp = adjustedEndDate.getTime();
    
    const classesRaw = await prisma.$queryRaw`
      SELECT 
        id, start, end, maxPlayers, totalPrice, level, category, 
        courtId, courtNumber, instructorId, clubId
      FROM TimeSlot
      WHERE start >= ${startTimestamp}
        AND start <= ${endTimestamp}
      ORDER BY start ASC
    ` as any[];

    console.log('🔍 SQL Query returned:', classesRaw.length, 'classes');
    console.log('   With courtId=null:', classesRaw.filter((c: any) => c.courtId === null).length);
    console.log('   With courtId!=null:', classesRaw.filter((c: any) => c.courtId !== null).length);

    // Obtener datos de instructor y bookings por separado
    const classes = await Promise.all(classesRaw.map(async (timeSlot: any) => {
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
            status: 'CONFIRMED'
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
