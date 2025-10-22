import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 TIMESLOTS API - WITH LEVEL & GENDER FILTERING - v5.0');
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');
    const instructorId = searchParams.get('instructorId');
    const userLevel = searchParams.get('userLevel'); // New parameter for automatic level filtering
    const userGender = searchParams.get('userGender'); // New parameter for gender filtering

    console.log('🔍 API Request params:', { clubId, date, instructorId, userLevel, userGender });

    // Build SQL query with proper date filtering
    let query = `SELECT * FROM TimeSlot WHERE 1=1`;
    const params: any[] = [];
    
    if (clubId) {
      query += ` AND clubId = ?`;
      params.push(clubId);
    }
    
    if (date) {
      // SQLite stores dates as integers (timestamps in milliseconds)
      // Convert the date string to timestamps for comparison
      const startOfDay = new Date(date + 'T00:00:00');
      const endOfDay = new Date(date + 'T23:59:59');
      
      // Get timestamps in milliseconds
      const startTimestamp = startOfDay.getTime();
      const endTimestamp = endOfDay.getTime();
      
      query += ` AND start >= ? AND start <= ?`;
      params.push(startTimestamp);
      params.push(endTimestamp);
      
      console.log('📅 Date filter:', {
        date,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        startTimestamp,
        endTimestamp
      });
    }
    
    if (instructorId) {
      query += ` AND instructorId = ?`;
      params.push(instructorId);
    }
    
    // 🚫 CRÍTICO: Filtrar clases que ya tienen pista asignada
    // Las clases completadas NO deben aparecer en nuevas tarjetas
    // para evitar solapamientos de instructor y pista
    query += ` AND courtId IS NULL`;
    
    query += ` ORDER BY start ASC`;

    console.log('📝 SQL Query:', query);
    console.log('📝 SQL Query:', query);
    console.log('📝 Params:', params);

    // Execute raw SQL query to get TimeSlots
    const timeSlots = await prisma.$queryRawUnsafe(query, ...params) as any[];

    console.log(`📊 Found ${timeSlots.length} time slots with SQL query`);

    // Obtener TODOS los IDs de TimeSlots para hacer queries optimizadas
    const timeSlotIds = timeSlots.map(slot => slot.id);
    const instructorIds = timeSlots.map(slot => slot.instructorId).filter(Boolean);

    // Query ÚNICA para TODOS los bookings de TODAS las clases
    const allBookings = await prisma.booking.findMany({
      where: {
        timeSlotId: { in: timeSlotIds },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            level: true,
            position: true,
            profilePictureUrl: true
          }
        }
      }
    });

    // Query ÚNICA para TODOS los instructores
    const allInstructors = instructorIds.length > 0 ? await prisma.instructor.findMany({
      where: { id: { in: instructorIds } },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            profilePictureUrl: true
          }
        }
      }
    }) : [];

    // Crear mapas para acceso rápido O(1)
    const bookingsBySlot = new Map<string, typeof allBookings>();
    allBookings.forEach(booking => {
      if (!bookingsBySlot.has(booking.timeSlotId)) {
        bookingsBySlot.set(booking.timeSlotId, []);
      }
      bookingsBySlot.get(booking.timeSlotId)!.push(booking);
    });

    const instructorMap = new Map(
      allInstructors.map(inst => [inst.id, inst])
    );

    // Formatear slots sin queries adicionales
    const formattedSlots = timeSlots.map((slot: any) => {
      // Obtener bookings de este slot del mapa
      const slotBookings = bookingsBySlot.get(slot.id) || [];
      
      const formattedBookings = slotBookings.map(booking => ({
        id: booking.id,
        userId: booking.userId,
        groupSize: booking.groupSize,
        status: booking.status,
        name: booking.user.name,  // Para compatibilidad con ClassCardReal
        userName: booking.user.name,  // Para compatibilidad con classesApi
        userEmail: booking.user.email,
        userLevel: booking.user.level,
        userGender: booking.user.position,
        profilePictureUrl: booking.user.profilePictureUrl,
        createdAt: booking.createdAt
      }));
      
      // Obtener instructor del mapa
      let instructorName = 'Instructor Genérico';
      let instructorProfilePicture = null;
      
      if (slot.instructorId) {
        const instructor = instructorMap.get(slot.instructorId);
        if (instructor?.user) {
          instructorName = instructor.user.name;
          instructorProfilePicture = instructor.user.profilePictureUrl;
        }
      }
      
      // Convert string dates from SQLite to proper Date objects
      const startDate = typeof slot.start === 'string' ? new Date(slot.start) : slot.start;
      const endDate = typeof slot.end === 'string' ? new Date(slot.end) : slot.end;
      
      return {
        id: slot.id,
        clubId: slot.clubId || '',
        courtId: slot.courtId,
        instructorId: slot.instructorId,
        start: startDate,
        end: endDate,
        maxPlayers: Number(slot.maxPlayers || 4),
        totalPrice: Number(slot.totalPrice || 0),
        level: slot.level || 'abierto',
        category: slot.category || 'general',
        genderCategory: slot.genderCategory || null, // AGREGADO: Categoría de género del TimeSlot
        createdAt: typeof slot.createdAt === 'string' ? new Date(slot.createdAt) : slot.createdAt,
        updatedAt: typeof slot.updatedAt === 'string' ? new Date(slot.updatedAt) : slot.updatedAt,
        instructorName: instructorName,
        instructorProfilePicture: instructorProfilePicture,
        courtNumber: slot.courtNumber || null,
        bookedPlayers: slotBookings.length,
        bookings: formattedBookings,
        description: ''
      };
    });

    const rawTimeSlots = formattedSlots;
    
    // Log para debug - mostrar primeros 3 slots con sus valores
    if (rawTimeSlots.length > 0) {
      console.log('📊 Sample de slots devueltos por API:');
      rawTimeSlots.slice(0, 3).forEach((slot, i) => {
        console.log(`  Slot ${i + 1}:`, {
          id: slot.id.substring(0, 12),
          level: slot.level,
          category: slot.category,
          courtNumber: slot.courtNumber,
          bookings: slot.bookings?.length || 0
        });
      });
    }

    // Apply level-based filtering if userLevel is provided
    let filteredSlots = rawTimeSlots;
    if (userLevel && userLevel !== 'abierto') {
      const userLevelNum = parseFloat(userLevel);
      
      filteredSlots = rawTimeSlots.filter(slot => {
        // If class is 'abierto', it's accessible to everyone
        if (slot.level === 'abierto') {
          return true;
        }
        
        // If class has a level range, check if user level falls within it
        if (typeof slot.level === 'object' && slot.level !== null) {
          const levelRange = slot.level as { min: string; max: string };
          const minLevel = parseFloat(levelRange.min);
          const maxLevel = parseFloat(levelRange.max);
          
          // User level must be within the class level range
          return userLevelNum >= minLevel && userLevelNum <= maxLevel;
        }
        
        // If class has a single numeric level string, allow ±0.5 range
        if (typeof slot.level === 'string') {
          const classLevel = parseFloat(slot.level);
          if (!isNaN(classLevel)) {
            return Math.abs(userLevelNum - classLevel) <= 0.5;
          }
        }
        
        // Default: show the class if we can't determine level compatibility
        return true;
      });
      
      console.log(`📊 Level filtering: ${rawTimeSlots.length} slots → ${filteredSlots.length} slots (user level: ${userLevel})`);
    }

    // Apply gender-based filtering if userGender is provided
    if (userGender && userGender !== 'mixto') {
      const beforeGenderFilter = filteredSlots.length;
      
      filteredSlots = filteredSlots.filter(slot => {
        // If class is 'mixto' or undefined, it's accessible to everyone
        if (!slot.genderCategory || slot.genderCategory === 'mixto') {
          return true;
        }
        
        // Otherwise, gender must match
        return slot.genderCategory === userGender;
      });
      
      console.log(`🚹🚺 Gender filtering: ${beforeGenderFilter} slots → ${filteredSlots.length} slots (user gender: ${userGender})`);
    }

    console.log('✅ Returning formatted slots:', filteredSlots.length);
    if (filteredSlots.length > 0) {
      console.log('📝 First slot example:', JSON.stringify(filteredSlots[0], null, 2));
    }

    return NextResponse.json(filteredSlots);
  } catch (error) {
    console.error('❌ Error fetching time slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
