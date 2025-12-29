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

    // Build filter conditions for Prisma
    const whereConditions: any = {};
    
    if (clubId) {
      whereConditions.clubId = clubId;
    }
    
    if (date) {
      // Use Date objects for filtering
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
    
    if (instructorId) {
      whereConditions.instructorId = instructorId;
    }

    console.log('📝 Where conditions:', whereConditions);

    // Execute Prisma query
    let timeSlots = await prisma.timeSlot.findMany({
      where: whereConditions,
      orderBy: { start: 'asc' }
    });

    console.log(`📊 Found ${timeSlots.length} time slots with Prisma query`);
    
    // ♻️ AGREGAR TimeSlots con bookings recicladas (aunque tengan courtId)
    const recycledBookings = await prisma.booking.findMany({
      where: {
        status: 'CANCELLED',
        isRecycled: true
      },
      select: {
        timeSlotId: true
      },
      distinct: ['timeSlotId']
    });
    
    if (recycledBookings.length > 0) {
      const recycledTimeSlotIds = recycledBookings.map(b => b.timeSlotId);
      console.log(`♻️ Found ${recycledTimeSlotIds.length} TimeSlots with recycled bookings`);
      
      // Obtener esos TimeSlots adicionales con los mismos filtros usando Prisma
      const recycledWhereConditions: any = {
        id: { in: recycledTimeSlotIds }
      };
      
      if (clubId) {
        recycledWhereConditions.clubId = clubId;
      }
      
      if (date) {
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');
        recycledWhereConditions.start = {
          gte: startOfDay,
          lte: endOfDay
        };
      }
      
      if (instructorId) {
        recycledWhereConditions.instructorId = instructorId;
      }
      
      const recycledTimeSlots = await prisma.timeSlot.findMany({
        where: recycledWhereConditions
      });
      
      console.log(`♻️ Found ${recycledTimeSlots.length} recycled TimeSlots matching filters`);
      
      // Combinar y eliminar duplicados
      const existingIds = new Set(timeSlots.map(s => s.id));
      const newRecycledSlots = recycledTimeSlots.filter(s => !existingIds.has(s.id));
      timeSlots = [...timeSlots, ...newRecycledSlots];
      
      console.log(`📊 Total after adding recycled: ${timeSlots.length} slots`);
    }
    
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
            OR: [
              { status: { in: ['PENDING', 'CONFIRMED'] } },
              { status: 'CANCELLED', isRecycled: true } // ♻️ Incluir canceladas recicladas
            ]
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
          OR: [
            { status: { in: ['PENDING', 'CONFIRMED'] } },
            { status: 'CANCELLED', isRecycled: true } // ♻️ Incluir canceladas recicladas
          ]
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
      where: { id: { in: instructorIds.filter((id): id is string => id !== null) } },
      select: {
        id: true,
        name: true,
        profilePictureUrl: true
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

    // 🏟️ Crear mapa de courtId -> courtNumber
    const courtMap = new Map(
      allCourts.map(court => [court.id, court.number])
    );

    // 📊 Calcular información de plazas recicladas por TimeSlot
    const recycledSlotsInfo = new Map();
    timeSlots.forEach((slot: any) => {
      const slotBookings = bookingsBySlot.get(slot.id) || [];
      const recycledBookings = slotBookings.filter((b: any) => b.status === 'CANCELLED' && b.isRecycled);
      const activeBookings = slotBookings.filter((b: any) => b.status !== 'CANCELLED');
      
      // ♻️ availableRecycledSlots = suma de groupSize de bookings cancelados con isRecycled
      const availableRecycledSlots = recycledBookings.reduce((sum: number, b: any) => sum + (Number(b.groupSize) || 1), 0);
      const hasRecycledSlots = availableRecycledSlots > 0;
      
      const recycledInfo = {
        hasRecycledSlots: hasRecycledSlots,
        recycledCount: recycledBookings.length,
        activeCount: activeBookings.length,
        availableRecycledSlots: availableRecycledSlots,
        recycledSlotsOnlyPoints: hasRecycledSlots // Si hay plazas recicladas, solo puntos
      };
      
      // 🎯 DEBUG: Log para verificar cálculo correcto
      if (recycledBookings.length > 0) {
        console.log(`♻️ Slot ${slot.id.substring(0, 15)}...`);
        console.log(`   - Bookings reciclados: ${recycledBookings.length}`);
        console.log(`   - Plazas disponibles: ${availableRecycledSlots} (${recycledBookings.map((b: any) => `${b.groupSize}p`).join(' + ')})`);
        console.log(`   - Bookings activos: ${activeBookings.length}`);
      }
      
      recycledSlotsInfo.set(slot.id, recycledInfo);
    });

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
        isRecycled: booking.isRecycled || false, // ♻️ Campo para identificar bookings reciclados
        name: booking.user.name,  // Para compatibilidad con ClassCardReal
        userName: booking.user.name,  // Para compatibilidad con classesApi
        userEmail: booking.user.email,
        userLevel: booking.user.level,
        userGender: booking.user.position,
        profilePictureUrl: booking.user.profilePictureUrl,
        createdAt: booking.createdAt
      }));
      
      // 🐛 DEBUG: Log para verificar bookings reciclados
      const recycledCount = formattedBookings.filter(b => b.isRecycled).length;
      if (recycledCount > 0) {
        console.log(`♻️ SLOT ${slot.id.substring(0, 15)}... tiene ${recycledCount} booking(s) reciclado(s)`);
        formattedBookings.filter(b => b.isRecycled).forEach(b => {
          console.log(`   - ${b.name}: status=${b.status}, isRecycled=${b.isRecycled}, groupSize=${b.groupSize}`);
        });
      }
      
      // Obtener instructor del mapa
      let instructorName = 'Instructor Genérico';
      let instructorProfilePicture = null;
      
      if (slot.instructorId) {
        const instructor = instructorMap.get(slot.instructorId);
        if (instructor) {
          instructorName = instructor.name; // El modelo Instructor tiene name directamente
          instructorProfilePicture = instructor.profilePictureUrl; // Y profilePictureUrl directamente
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
      
      // ♻️ Información de plazas recicladas
      const recycledInfo = recycledSlotsInfo.get(slot.id) || {
        hasRecycledSlots: false,
        recycledCount: 0,
        activeCount: 0,
        availableRecycledSlots: 0,
        recycledSlotsOnlyPoints: false
      };
      
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
        instructorPhoto: instructorProfilePicture, // Cambiado de instructorProfilePicture a instructorPhoto
        instructorProfilePicture: instructorProfilePicture, // Mantener también por compatibilidad
        courtNumber: slot.courtId ? courtMap.get(slot.courtId) || null : null,
        bookedPlayers: slotBookings.length,
        bookings: formattedBookings,
        description: '',
        courtsAvailability: courtsAvailability, // 🏟️ Array de disponibilidad de pistas
        availableCourtsCount: availableCourtsCount, // 🏟️ Contador rápido
        creditsSlots: creditsSlots, // 🎁 Plazas reservables con puntos
        creditsCost: Number(slot.creditsCost || 50), // 🎁 Coste en puntos
        // ♻️ Información de plazas recicladas (desde BD)
        hasRecycledSlots: recycledInfo.hasRecycledSlots,
        availableRecycledSlots: recycledInfo.availableRecycledSlots,
        recycledSlotsOnlyPoints: recycledInfo.recycledSlotsOnlyPoints
      };
    });

    const rawTimeSlots = formattedSlots;
    
    // 🎯 DEBUG: Log del slot de Carlos ANTES de devolverlo
    const carlosSlot = rawTimeSlots.find(s => s.instructorName === 'Carlos Rodríguez' && s.start.toISOString().includes('09:00'));
    if (carlosSlot) {
      console.log('🎯 SLOT DE CARLOS ANTES DE DEVOLVER:', {
        id: carlosSlot.id,
        hasRecycledSlots: carlosSlot.hasRecycledSlots,
        availableRecycledSlots: carlosSlot.availableRecycledSlots,
        recycledSlotsOnlyPoints: carlosSlot.recycledSlotsOnlyPoints,
        bookings: carlosSlot.bookings.map(b => ({ name: b.name, status: b.status, isRecycled: b.isRecycled }))
      });
    }
    
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
      
      // Obtener el ID del usuario desde los parámetros de búsqueda si está disponible
      const userId = searchParams.get('userId');
      
      filteredSlots = rawTimeSlotsFiltered.filter(slot => {
        // 🎯 REGLA 1: Si el usuario tiene una reserva en esta clase, SIEMPRE mostrarla
        if (userId) {
          const userHasBooking = bookingsBySlot.get(slot.id)?.some(
            b => b.userId === userId && b.status !== 'CANCELLED'
          );
          if (userHasBooking) {
            console.log(`✅ Mostrando clase ${slot.id.substring(0,8)} - Usuario tiene reserva`);
            return true;
          }
        }
        
        // 🎯 REGLA 2: Obtener bookings activos de esta clase (no cancelados)
        const activeBookings = bookingsBySlot.get(slot.id)?.filter(
          b => b.status !== 'CANCELLED'
        ) || [];
        
        const hasActiveBookings = activeBookings.length > 0;
        
        // 🎯 REGLA 3: Si la clase NO tiene inscripciones, solo mostrar si es ABIERTA
        if (!hasActiveBookings) {
          const isOpen = typeof slot.level === 'string' && slot.level.toLowerCase() === 'abierto';
          if (!isOpen) {
            console.log(`⏭️  Filtrado: Clase ${slot.id.substring(0,8)} sin inscripciones y nivel ${slot.level} (no ABIERTO)`);
          }
          return isOpen;
        }
        
        // 🎯 REGLA 4: Si la clase SÍ tiene inscripciones, verificar si el usuario encaja en el rango
        // Usar levelRange del slot si está disponible
        if (slot.levelRange && typeof slot.levelRange === 'string' && slot.levelRange !== 'ABIERTO') {
          if (slot.levelRange.includes('-')) {
            const [minStr, maxStr] = slot.levelRange.split('-');
            const minLevel = parseFloat(minStr);
            const maxLevel = parseFloat(maxStr);
            if (!isNaN(minLevel) && !isNaN(maxLevel)) {
              const isInRange = userLevelNum >= minLevel && userLevelNum <= maxLevel;
              if (!isInRange) {
                console.log(`⏭️  Filtrado: Usuario nivel ${userLevelNum} NO está en rango ${slot.levelRange} (clase con ${activeBookings.length} inscripciones)`);
              }
              return isInRange;
            }
          }
        }
        
        // Usar level del slot si levelRange no está disponible
        if (typeof slot.level === 'string' && slot.level !== 'ABIERTO' && slot.level.includes('-')) {
          const [minStr, maxStr] = slot.level.split('-');
          const minLevel = parseFloat(minStr);
          const maxLevel = parseFloat(maxStr);
          if (!isNaN(minLevel) && !isNaN(maxLevel)) {
            const isInRange = userLevelNum >= minLevel && userLevelNum <= maxLevel;
            if (!isInRange) {
              console.log(`⏭️  Filtrado: Usuario nivel ${userLevelNum} NO está en rango ${slot.level} (clase con ${activeBookings.length} inscripciones)`);
            }
            return isInRange;
          }
        }
        
        // Si la clase tiene inscripciones pero nivel ABIERTO, mostrarla
        if (typeof slot.level === 'string' && slot.level.toLowerCase() === 'abierto') {
          return true;
        }
        
        // Por defecto, si no podemos determinar, mostrar la clase
        return true;
      });
      
      console.log(`📊 Level filtering: ${rawTimeSlotsFiltered.length} slots → ${filteredSlots.length} slots (user level: ${userLevel})`);
    }

    // ℹ️ CATEGORÍA DE GÉNERO: Solo informativa, NO restrictiva
    // Todos los usuarios pueden ver todas las clases independientemente de su género
    // La categoría se muestra en la UI pero no filtra resultados
    if (userGender && userGender !== 'abierto') {
      console.log(`ℹ️ Género del usuario: ${userGender} (solo informativo, no se aplica filtro restrictivo)`);
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

    // Sin paginación: devolver todos los slots con estructura correcta
    console.log('✅ Returning all slots (no pagination):', filteredSlots.length);
    if (filteredSlots.length > 0) {
      console.log('📝 First slot example:', JSON.stringify(filteredSlots[0], null, 2));
    }

    // ✅ IMPORTANTE: Devolver objeto con estructura {slots, pagination} para compatibilidad con frontend
    const responseData = {
      slots: filteredSlots,
      pagination: {
        page: 1,
        limit: filteredSlots.length,
        totalSlots: filteredSlots.length,
        totalPages: 1,
        hasMore: false
      }
    };

    const response = NextResponse.json(responseData);
    
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

// POST: Crear nueva clase (TimeSlot)
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/timeslots - Creating new class');
    const body = await request.json();
    
    const {
      clubId,
      startTime, // DateTime
      instructorId,
      maxPlayers,
      level, // String "abierto" o objeto {min, max}
      category, // "abierta" | "chica" | "chico"
      durationMinutes = 60
    } = body;

    // Validaciones básicas
    if (!clubId || !startTime || !instructorId || !maxPlayers || !level || !category) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Parsear fechas
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Fecha de inicio inválida' },
        { status: 400 }
      );
    }

    // Verificar que el instructor existe
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId }
    });

    if (!instructor) {
      return NextResponse.json(
        { error: 'Instructor no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el club existe
    const club = await prisma.club.findUnique({
      where: { id: clubId }
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Club no encontrado' },
        { status: 404 }
      );
    }

    // Formatear level
    let levelString = '';
    let levelRangeString = '';
    if (typeof level === 'string') {
      levelString = level;
      levelRangeString = level === 'abierto' ? 'abierto' : level;
    } else if (typeof level === 'object' && level.min && level.max) {
      levelString = `${level.min}-${level.max}`;
      levelRangeString = `${level.min}-${level.max}`;
    } else {
      levelString = 'abierto';
      levelRangeString = 'abierto';
    }

    // Calcular precios
    const instructorPricePerHour = instructor.hourlyRate || 0;
    const courtRentalPrice = 0; // Por defecto
    const totalPrice = (instructorPricePerHour + courtRentalPrice) * (durationMinutes / 60);

    // Crear el TimeSlot como PROPUESTA (sin pista asignada)
    const newTimeSlot = await prisma.timeSlot.create({
      data: {
        clubId,
        instructorId,
        start: startDate,
        end: endDate,
        maxPlayers,
        courtNumber: null, // NULL = propuesta, se asigna cuando se complete
        courtId: null, // Sin asignar hasta que se llene
        level: levelString,
        levelRange: levelRangeString,
        category,
        genderCategory: null, // Se asigna con la primera reserva
        instructorPrice: instructorPricePerHour,
        courtRentalPrice,
        totalPrice,
        hasRecycledSlots: false,
        availableRecycledSlots: null,
        recycledSlotsOnlyPoints: true,
        creditsSlots: null,
        creditsCost: 50
      },
      include: {
        instructor: true,
        club: true,
        bookings: true
      }
    });

    console.log('✅ TimeSlot created successfully:', newTimeSlot.id);

    return NextResponse.json({
      success: true,
      timeSlot: {
        ...newTimeSlot,
        start: newTimeSlot.start.getTime(),
        end: newTimeSlot.end.getTime(),
        createdAt: newTimeSlot.createdAt.getTime(),
        updatedAt: newTimeSlot.updatedAt.getTime()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating TimeSlot:', error);
    return NextResponse.json(
      {
        error: 'Failed to create time slot',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
