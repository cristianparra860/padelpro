import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 TIMESLOTS API - WITH LEVEL & GENDER FILTERING + PAGINATION - v6.0');
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');
    const instructorId = searchParams.get('instructorId');
    const userLevel = searchParams.get('userLevel'); // New parameter for automatic level filtering
    const userGender = searchParams.get('userGender'); // New parameter for gender filtering
    const timeSlotFilter = searchParams.get('timeSlotFilter'); // 🕐 Filtro de horario: morning, midday, evening
    const page = parseInt(searchParams.get('page') || '1'); // Pagination: page number (default: 1)
    const limit = parseInt(searchParams.get('limit') || '10'); // Pagination: items per page (default: 10)

    console.log('🔍 API Request params:', { clubId, date, instructorId, userLevel, userGender, timeSlotFilter, page, limit });

    // Build SQL query with proper date filtering
    let query = `SELECT * FROM TimeSlot WHERE 1=1`;
    const params: any[] = [];
    
    if (clubId) {
      query += ` AND clubId = ?`;
      params.push(clubId);
    }
    
    if (date) {
      // Use only timestamp format (BigInt milliseconds since epoch)
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      
      const startTimestamp = startOfDay.getTime();
      const endTimestamp = endOfDay.getTime();
      
      // Only check timestamp format (matches Prisma BigInt storage)
      query += ` AND start >= ? AND start <= ?`;
      params.push(startTimestamp, endTimestamp);
      
      console.log('📅 Date filter (timestamps):', {
        date,
        startTimestamp,
        endTimestamp,
        startISO: startOfDay.toISOString(),
        endISO: endOfDay.toISOString()
      });
    }
    
    if (instructorId) {
      query += ` AND instructorId = ?`;
      params.push(instructorId);
    }
    
    // NOTE: We show ALL classes (both proposals and confirmed)
    // Users should see confirmed classes to book them
    
    query += ` ORDER BY start ASC`;

    console.log('📝 SQL Query:', query);
    console.log('📝 Params:', params);

    // Execute raw SQL query to get TimeSlots
    const timeSlots = await prisma.$queryRawUnsafe(query, ...params) as any[];

    console.log(`📊 Found ${timeSlots.length} time slots with SQL query`);
    
    // 🐛 DEBUG: Verificar si levelRange viene de la base de datos
    if (timeSlots.length > 0) {
      console.log('🔍 Sample slot from DB:', {
        id: timeSlots[0].id,
        levelRange: timeSlots[0].levelRange,
        level: timeSlots[0].level,
        hasLevelRange: 'levelRange' in timeSlots[0]
      });
    }

    // Obtener TODOS los IDs de TimeSlots para hacer queries optimizadas
    const timeSlotIds = timeSlots.map(slot => slot.id);
    const instructorIds = timeSlots.map(slot => slot.instructorId).filter(Boolean);

    // Query para bookings - dividir en lotes si hay demasiados TimeSlots
    let allBookings: any[] = [];
    
    if (timeSlotIds.length > 500) {
      // Dividir en lotes de 500 para evitar límite de parámetros de SQLite
      const batchSize = 500;
      for (let i = 0; i < timeSlotIds.length; i += batchSize) {
        const batch = timeSlotIds.slice(i, i + batchSize);
        const batchBookings = await prisma.booking.findMany({
          where: {
            timeSlotId: { in: batch },
            status: { in: ['PENDING', 'CONFIRMED'] } // Incluir PENDING y CONFIRMED
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
        allBookings = allBookings.concat(batchBookings);
      }
      console.log(`📚 Total bookings cargados en ${Math.ceil(timeSlotIds.length / batchSize)} lotes: ${allBookings.length}`);
    } else {
      // Query directa si son pocos TimeSlots
      allBookings = await prisma.booking.findMany({
        where: {
          timeSlotId: { in: timeSlotIds },
          status: { in: ['PENDING', 'CONFIRMED'] } // Incluir PENDING y CONFIRMED
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
      console.log(`📚 Total bookings cargados: ${allBookings.length}`);
    }
    
    console.log(`📚 Total bookings cargados (sin CANCELLED): ${allBookings.length}`);
    if (allBookings.length > 0) {
      console.log('📋 Ejemplo de booking:', {
        id: allBookings[0].id.substring(0, 8),
        status: allBookings[0].status,
        timeSlotId: allBookings[0].timeSlotId.substring(0, 8),
        userName: allBookings[0].user.name
      });
    }

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

    // 🏟️ Obtener TODAS las pistas del club para verificar disponibilidad
    const allCourts = clubId ? await prisma.court.findMany({
      where: { 
        clubId: clubId,
        isActive: true 
      },
      orderBy: { number: 'asc' }
    }) : [];

    // 📅 Obtener TODAS las clases confirmadas del día para verificar ocupación de pistas
    const confirmedClasses = date ? await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.end,
        t.courtId,
        c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.clubId = ?
        AND ((t.start >= ? AND t.start <= ?) OR (t.start >= ? AND t.start <= ?))
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `, 
      clubId,
      new Date(date + 'T00:00:00.000Z').getTime(),
      new Date(date + 'T23:59:59.999Z').getTime(),
      date + 'T00:00:00.000Z',
      date + 'T23:59:59.999Z'
    ) as any[] : [];

    console.log(`🏟️ Found ${allCourts.length} courts and ${confirmedClasses.length} confirmed classes`);

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
      
      if (slotBookings.length > 0) {
        console.log(`🔍 Slot ${slot.id.substring(0, 15)} has ${slotBookings.length} bookings:`, 
          slotBookings.map(b => ({ user: b.user.name, size: b.groupSize, status: b.status })));
      }
      
      // 🎁 Parsear creditsSlots (plazas reservables con puntos)
      let creditsSlots: number[] = [];
      if (slot.creditsSlots) {
        try {
          creditsSlots = JSON.parse(slot.creditsSlots);
        } catch (e) {
          console.warn('⚠️ Error parseando creditsSlots para slot:', slot.id);
        }
      }
      if (slot.creditsSlots) {
        try {
          creditsSlots = JSON.parse(slot.creditsSlots);
        } catch (e) {
          console.warn('⚠️ Error parseando creditsSlots para slot:', slot.id);
        }
      }
      
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
      
      // 🏟️ Calcular disponibilidad de pistas para este horario
      const slotStart = startDate.getTime();
      const slotEnd = endDate.getTime();
      
      const courtsAvailability = allCourts.map(court => {
        // Verificar si esta pista está ocupada durante este horario
        const isOccupied = confirmedClasses.some((cls: any) => {
          const clsStart = typeof cls.start === 'bigint' ? Number(cls.start) : new Date(cls.start).getTime();
          const clsEnd = typeof cls.end === 'bigint' ? Number(cls.end) : new Date(cls.end).getTime();
          
          // Verificar si es la misma pista Y hay solapamiento de horario
          const isSameCourt = cls.courtId === court.id;
          const hasOverlap = slotStart < clsEnd && slotEnd > clsStart;
          
          return isSameCourt && hasOverlap;
        });
        
        return {
          courtNumber: court.number,
          courtId: court.id,
          status: isOccupied ? 'occupied' : 'available'
        };
      });
      
      const availableCourtsCount = courtsAvailability.filter(c => c.status === 'available').length;
      
      return {
        id: slot.id,
        clubId: slot.clubId || '',
        courtId: slot.courtId,
        instructorId: slot.instructorId,
        start: startDate,
        end: endDate,
        maxPlayers: Number(slot.maxPlayers || 4),
        totalPrice: Number(slot.totalPrice || 0),
        instructorPrice: Number(slot.instructorPrice || 0), // AGREGADO: Precio del instructor
        courtRentalPrice: Number(slot.courtRentalPrice || 0), // AGREGADO: Precio de la pista
        level: slot.level || 'abierto',
        category: slot.category || 'general',
        genderCategory: slot.genderCategory || null, // AGREGADO: Categoría de género del TimeSlot
        levelRange: slot.levelRange || null, // AGREGADO: Rango de nivel del TimeSlot
        createdAt: typeof slot.createdAt === 'string' ? new Date(slot.createdAt) : slot.createdAt,
        updatedAt: typeof slot.updatedAt === 'string' ? new Date(slot.updatedAt) : slot.updatedAt,
        instructorName: instructorName,
        instructorProfilePicture: instructorProfilePicture,
        courtNumber: slot.courtNumber || null,
        bookedPlayers: slotBookings.length,
        bookings: formattedBookings,
        description: '',
        courtsAvailability: courtsAvailability, // 🏟️ Array de disponibilidad de pistas
        availableCourtsCount: availableCourtsCount, // 🏟️ Contador rápido
        creditsSlots: creditsSlots, // 🎁 Plazas reservables con puntos
        creditsCost: Number(slot.creditsCost || 50) // 🎁 Coste en puntos
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

    // 🚫 FILTRAR PROPUESTAS BLOQUEADAS (solo propuestas sin pista asignada)
    // ✅ BLOQUEO DE SLOTS 30MIN ANTES DESACTIVADO
    // Las propuestas ahora se muestran siempre, incluso si hay clases confirmadas cerca
    // El sistema de reservas validará conflictos al intentar reservar
    const proposalsOnly = rawTimeSlots.filter(slot => !slot.courtId);
    const confirmedOnly = rawTimeSlots.filter(slot => slot.courtId);
    
    // Mostrar todas las propuestas sin filtrar
    const availableProposals = proposalsOnly;
    
    // Combinar propuestas disponibles + clases confirmadas
    const rawTimeSlotsFiltered = [...availableProposals, ...confirmedOnly];
    
    console.log(`✅ Todas las propuestas visibles: ${proposalsOnly.length} propuestas mostradas (filtro de bloqueo desactivado)`);

    // Apply level-based filtering if userLevel is provided
    let filteredSlots = rawTimeSlotsFiltered;
    if (userLevel && userLevel !== 'abierto') {
      const userLevelNum = parseFloat(userLevel);
      
      filteredSlots = rawTimeSlotsFiltered.filter(slot => {
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
      
      console.log(`📊 Level filtering: ${rawTimeSlotsFiltered.length} slots → ${filteredSlots.length} slots (user level: ${userLevel})`);
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

    // 🕐 FILTRAR POR HORARIO (morning, midday, evening)
    if (timeSlotFilter && timeSlotFilter !== 'all') {
      const beforeTimeFilter = filteredSlots.length;
      
      filteredSlots = filteredSlots.filter(slot => {
        // Convertir el timestamp a hora
        const startTime = new Date(Number(slot.start));
        const hour = startTime.getHours();
        
        switch (timeSlotFilter) {
          case 'morning': // Mañanas (8-13h)
            return hour >= 8 && hour < 13;
          case 'midday': // Mediodía (13-18h)
            return hour >= 13 && hour < 18;
          case 'evening': // Tardes (18-22h)
            return hour >= 18 && hour < 22;
          default:
            return true;
        }
      });
      
      console.log(`🕐 Time slot filtering: ${beforeTimeFilter} slots → ${filteredSlots.length} slots (filter: ${timeSlotFilter})`);
    }

    // 🏟️ FILTRAR PROPUESTAS SIN PISTAS DISPONIBLES (solo para propuestas sin confirmar)
    // NOTA: Si se consulta con instructorId, NO filtrar por disponibilidad de pistas
    // (el instructor debe ver todas sus propuestas para gestionarlas)
    const beforeCourtFilter = filteredSlots.length;
    if (!instructorId) {
      // Solo aplicar filtro de disponibilidad si NO es consulta de instructor
      filteredSlots = filteredSlots.filter(slot => {
        // Si es una clase confirmada (ya tiene pista asignada), siempre mostrar
        if (slot.courtId) {
          return true;
        }
        
        // Si es una propuesta, solo mostrar si hay al menos 1 pista disponible
        return slot.availableCourtsCount > 0;
      });
      
      console.log(`🏟️ Court availability filtering: ${beforeCourtFilter} slots → ${filteredSlots.length} slots (removed ${beforeCourtFilter - filteredSlots.length} slots with no available courts)`);
    } else {
      console.log(`👨‍🏫 Instructor query: Skipping court availability filter (showing all proposals)`);
    }

    // 📊 ORDENAR: Primero clases con usuarios inscritos o confirmadas, luego vacías
    filteredSlots.sort((a, b) => {
      // Prioridad 1: Clases confirmadas (con pista asignada)
      const aIsConfirmed = a.courtId !== null;
      const bIsConfirmed = b.courtId !== null;
      
      // Prioridad 2: Clases con usuarios inscritos
      const aHasBookings = (a.bookings?.length || 0) > 0;
      const bHasBookings = (b.bookings?.length || 0) > 0;
      
      // Calcular "peso" de prioridad
      const aWeight = (aIsConfirmed ? 2 : 0) + (aHasBookings ? 1 : 0);
      const bWeight = (bIsConfirmed ? 2 : 0) + (bHasBookings ? 1 : 0);
      
      // Si tienen diferente prioridad, ordenar por prioridad (mayor primero)
      if (aWeight !== bWeight) {
        return bWeight - aWeight; // Mayor peso primero
      }
      
      // Si tienen la misma prioridad, ordenar por horario (más temprano primero)
      const aTime = new Date(a.start).getTime();
      const bTime = new Date(b.start).getTime();
      return aTime - bTime;
    });
    
    console.log(`📊 Ordenamiento aplicado: ${filteredSlots.filter(s => s.courtId || (s.bookings?.length || 0) > 0).length} clases con actividad primero, ${filteredSlots.filter(s => !s.courtId && !(s.bookings?.length || 0)).length} clases vacías después`);

    // 📄 PAGINACIÓN: Solo aplicar si se especificaron parámetros page/limit
    if (page && limit && page > 0 && limit > 0) {
      const totalSlots = filteredSlots.length;
      const totalPages = Math.ceil(totalSlots / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSlots = filteredSlots.slice(startIndex, endIndex);
      
      console.log(`📄 Pagination: Page ${page}/${totalPages}, showing ${paginatedSlots.length} of ${totalSlots} slots (${startIndex}-${endIndex})`);

      console.log('✅ Returning paginated slots:', paginatedSlots.length);
      if (paginatedSlots.length > 0) {
        console.log('📝 First slot example:', JSON.stringify(paginatedSlots[0], null, 2));
      }

      // Respuesta paginada
      const response = NextResponse.json({
        slots: paginatedSlots,
        pagination: {
          page,
          limit,
          totalSlots,
          totalPages,
          hasMore: page < totalPages
        }
      });
      
      // Sin caché para datos actualizados
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    }

    // Sin paginación: devolver todos los slots en formato clásico (retrocompatibilidad)
    console.log('✅ Returning all slots (no pagination):', filteredSlots.length);
    if (filteredSlots.length > 0) {
      console.log('📝 First slot example:', JSON.stringify(filteredSlots[0], null, 2));
    }

    // Agregar headers de caché para mejorar rendimiento
    const response = NextResponse.json(filteredSlots);
    
    // TEMPORALMENTE: Sin caché para forzar actualización con courtsAvailability
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('');
    console.error('═'.repeat(80));
    console.error('❌❌❌ ERROR CRÍTICO EN /api/timeslots ❌❌❌');
    console.error('═'.repeat(80));
    console.error('Error completo:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Mensaje:', error instanceof Error ? error.message : 'Unknown error');
    console.error('═'.repeat(80));
    console.error('');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch time slots', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
