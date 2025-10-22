// API corregida para la estructura real de la BD
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🎯 FUNCIÓN PARA AUTO-GENERAR NUEVA TARJETA ABIERTA
async function autoGenerateOpenSlot(originalTimeSlotId: string, prisma: any) {
  try {
    console.log('🔄 Auto-generando nueva tarjeta abierta para slot:', originalTimeSlotId);
    
    // Obtener información del slot original
    const originalSlot = await prisma.$queryRaw`
      SELECT * FROM TimeSlot WHERE id = ${originalTimeSlotId}
    `;

    if (!originalSlot || (originalSlot as any[]).length === 0) {
      console.log('❌ Slot original no encontrado');
      return;
    }

    const slot = (originalSlot as any[])[0];
    
    // Verificar si es la primera inscripción (esto determina si necesitamos crear nueva tarjeta)
    const bookingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Booking 
      WHERE timeSlotId = ${originalTimeSlotId} 
      AND status IN ('PENDING', 'CONFIRMED')
    `;

    const count = (bookingCount as any[])[0].count;
    console.log(`📊 Número de reservas para este slot: ${count}`);

    // Solo crear nueva tarjeta si es la primera inscripción
    if (count === 1) {
      console.log('🎯 Primera inscripción detectada, creando nueva tarjeta abierta...');
      
      // Crear nueva tarjeta con los mismos parámetros pero categoría y nivel "abierto"
      const newSlotId = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await prisma.$executeRaw`
        INSERT INTO TimeSlot (
          id, clubId, courtId, instructorId, start, end, 
          maxPlayers, totalPrice, level, category, createdAt, updatedAt
        )
        VALUES (
          ${newSlotId}, 
          ${slot.clubId}, 
          ${slot.courtId}, 
          ${slot.instructorId}, 
          ${slot.start}, 
          ${slot.end}, 
          ${slot.maxPlayers || 4}, 
          ${slot.totalPrice}, 
          'abierto', 
          'mixto', 
          datetime('now'), 
          datetime('now')
        )
      `;

      console.log('✅ Nueva tarjeta abierta creada:', newSlotId);
      console.log(`📅 Horario: ${slot.start} - ${slot.end}`);
      console.log(`👨‍🏫 Instructor: ${slot.instructorId}`);
      console.log(`🏟️ Cancha: ${slot.courtId}`);
    } else {
      console.log('ℹ️ No es la primera inscripción, no se crea nueva tarjeta');
    }

  } catch (error) {
    console.error('❌ Error auto-generando tarjeta:', error);
    // No fallar la reserva original por este error
    return;
  }
}

export async function POST(request: Request) {
  try {
    console.log('🔍 POST /api/classes/book - Starting...');
    
    const body = await request.json();
    console.log('📝 Body received:', body);
    
    const { userId, timeSlotId, groupSize = 1 } = body;
    console.log('🔍 Extracted values:', { userId, timeSlotId, groupSize, typeOfGroupSize: typeof groupSize });

    if (!userId || !timeSlotId) {
      return NextResponse.json({ error: 'Missing userId or timeSlotId' }, { status: 400 });
    }

    // Verificar que el timeSlot existe usando SQL directo
    const timeSlotExists = await prisma.$queryRaw`
      SELECT id FROM TimeSlot WHERE id = ${timeSlotId}
    `;

    if (!timeSlotExists || (timeSlotExists as any[]).length === 0) {
      return NextResponse.json({ error: 'TimeSlot not found' }, { status: 404 });
    }

    // Verificar que el usuario existe
    const userExists = await prisma.$queryRaw`
      SELECT id FROM User WHERE id = ${userId}
    `;

    if (!userExists || (userExists as any[]).length === 0) {
      console.log('❌ Usuario no encontrado:', userId);
      return NextResponse.json({ error: `User not found: ${userId}` }, { status: 404 });
    }
      
      console.log('✅ Usuario encontrado:', userId);

      // Verificar si ya existe una reserva PARA ESTA MODALIDAD ESPECÍFICA
      const existingBookingForGroupSize = await prisma.$queryRaw`
        SELECT id FROM Booking 
        WHERE userId = ${userId} 
        AND timeSlotId = ${timeSlotId} 
        AND groupSize = ${Number(groupSize) || 1}
        AND status IN ('PENDING', 'CONFIRMED')
      `;

      if (existingBookingForGroupSize && (existingBookingForGroupSize as any[]).length > 0) {
        return NextResponse.json({ error: `Ya tienes una reserva para la modalidad de ${groupSize} jugador${groupSize > 1 ? 'es' : ''} en esta clase` }, { status: 400 });
      }

      // Verificar si la modalidad específica ya está completa
      const modalityBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM Booking 
        WHERE timeSlotId = ${timeSlotId} 
        AND groupSize = ${Number(groupSize) || 1}
        AND status IN ('PENDING', 'CONFIRMED')
      `;

      const currentModalityBookings = Number((modalityBookings as any[])[0].count);
      const requiredBookingsForModality = Number(groupSize) || 1;

      console.log(`📊 Modalidad ${groupSize}: ${currentModalityBookings}/${requiredBookingsForModality} reservas`);

      if (currentModalityBookings >= requiredBookingsForModality) {
        return NextResponse.json({ 
          error: `La modalidad de ${groupSize} jugador${groupSize > 1 ? 'es' : ''} ya está completa (${currentModalityBookings}/${requiredBookingsForModality})` 
        }, { status: 400 });
      }

      // 💰 OBTENER PRECIO DEL TIMESLOT Y VERIFICAR SALDO
      const priceInfo = await prisma.$queryRaw`
        SELECT totalPrice FROM TimeSlot WHERE id = ${timeSlotId}
      `;

      if (!priceInfo || (priceInfo as any[]).length === 0) {
        return NextResponse.json({ error: 'No se pudo obtener información del precio' }, { status: 500 });
      }

      const totalPrice = Number((priceInfo as any[])[0].totalPrice) || 55;
      const pricePerPerson = totalPrice / (Number(groupSize) || 1);

      console.log(`💰 Precio total: €${totalPrice}, Precio por persona (${groupSize} jugadores): €${pricePerPerson.toFixed(2)}`);

      // Verificar saldo del usuario
      const userInfo = await prisma.$queryRaw`
        SELECT credits FROM User WHERE id = ${userId}
      `;

      const currentCredits = Number((userInfo as any[])[0].credits) || 0;
      console.log(`💳 Saldo actual del usuario: €${currentCredits.toFixed(2)}`);

      if (currentCredits < pricePerPerson) {
        console.log(`❌ Saldo insuficiente: necesita €${pricePerPerson.toFixed(2)}, tiene €${currentCredits.toFixed(2)}`);
        return NextResponse.json({ 
          error: `Saldo insuficiente`,
          details: `Necesitas €${pricePerPerson.toFixed(2)} pero solo tienes €${currentCredits.toFixed(2)}. Por favor, recarga tu saldo.`,
          required: pricePerPerson,
          current: currentCredits,
          missing: pricePerPerson - currentCredits
        }, { status: 400 });
      }

      // Descontar el saldo
      const newCredits = currentCredits - pricePerPerson;
      await prisma.$executeRaw`
        UPDATE User SET credits = ${newCredits}, updatedAt = datetime('now') WHERE id = ${userId}
      `;

      console.log(`✅ Saldo actualizado: €${currentCredits.toFixed(2)} → €${newCredits.toFixed(2)} (descuento: €${pricePerPerson.toFixed(2)})`);

      // 🔍 VERIFICAR SI ES LA PRIMERA RESERVA (antes de crear la nueva)
      const existingBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM Booking 
        WHERE timeSlotId = ${timeSlotId} 
        AND status IN ('PENDING', 'CONFIRMED')
      ` as Array<{count: number}>;

      const isFirstBooking = Number(existingBookings[0]?.count) === 0;
      console.log(`📋 Existing bookings for this slot: ${existingBookings[0]?.count}`);
      console.log(`🎯 Is this the first booking? ${isFirstBooking}`);

      // Crear la reserva CON groupSize (la columna existe según el schema)
      const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await prisma.$executeRaw`
        INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, createdAt, updatedAt)
        VALUES (${bookingId}, ${userId}, ${timeSlotId}, ${Number(groupSize) || 1}, 'CONFIRMED', datetime('now'), datetime('now'))
      `;

      console.log('✅ Booking created successfully:', bookingId);

      // 🏷️ ESTABLECER CATEGORÍA DEL TIMESLOT basada en el primer jugador
      if (isFirstBooking) {
        console.log('🏷️ This is the FIRST booking for this TimeSlot, setting category...');
        
        // Obtener la categoría del usuario
        const userInfo = await prisma.$queryRaw`
          SELECT genderCategory FROM User WHERE id = ${userId}
        ` as Array<{genderCategory: string | null}>;
        
        const userGender = userInfo[0]?.genderCategory || 'mixto';
        console.log(`   👤 User gender: ${userGender}`);
        
        // Actualizar el TimeSlot con la categoría del primer jugador
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET genderCategory = ${userGender}, updatedAt = datetime('now')
          WHERE id = ${timeSlotId}
        `;
        
        console.log(`   ✅ TimeSlot category set to: ${userGender}`);
      }

      // 🏁 SISTEMA DE CARRERAS: Verificar si alguna modalidad se completa
      console.log('🏁 RACE SYSTEM: Checking if any group option is complete...');
      
      // Obtener todas las reservas activas para este timeSlot
      const allBookingsForSlot = await prisma.$queryRaw`
        SELECT id, userId, groupSize, status, createdAt 
        FROM Booking 
        WHERE timeSlotId = ${timeSlotId} 
        AND status IN ('PENDING', 'CONFIRMED')
      ` as Array<{id: string, userId: string, groupSize: number, status: string, createdAt: string}>;

      console.log(`📊 Total active bookings for this slot: ${allBookingsForSlot.length}`);
      
      // Agrupar las reservas por groupSize
      const bookingsByGroupSize = new Map<number, number>();
      allBookingsForSlot.forEach(booking => {
        const currentCount = bookingsByGroupSize.get(booking.groupSize) || 0;
        bookingsByGroupSize.set(booking.groupSize, currentCount + 1);
      });

      console.log('📈 Bookings by groupSize:', Object.fromEntries(bookingsByGroupSize));

      // Verificar cada opción de grupo para ver si alguna está completa
      let raceWinner: number | null = null;
      let courtAssigned: number | null = null;
      
      for (const [groupSize, count] of bookingsByGroupSize.entries()) {
        console.log(`   🔍 Option ${groupSize} players: ${count}/${groupSize} bookings`);
        
        if (count >= groupSize) {
          console.log(`   ✅ WINNER! Option for ${groupSize} player(s) is COMPLETE!`);
          raceWinner = groupSize;
          
          // Verificar si el timeSlot ya tiene pista asignada
          const currentTimeSlot = await prisma.$queryRaw`
            SELECT courtNumber FROM TimeSlot WHERE id = ${timeSlotId}
          ` as Array<{courtNumber: number | null}>;
          
          if (currentTimeSlot[0]?.courtNumber) {
            console.log(`   ℹ️ Court already assigned: ${currentTimeSlot[0].courtNumber}`);
            courtAssigned = currentTimeSlot[0].courtNumber;
          } else {
            // 🎾 ASIGNAR UNA PISTA DISPONIBLE (con verificación completa)
            console.log(`   🔍 Finding available court...`);
            
            // Obtener el horario de esta clase
            const timeSlotTiming = await prisma.$queryRaw`
              SELECT start, end, clubId FROM TimeSlot WHERE id = ${timeSlotId}
            ` as Array<{start: string, end: string, clubId: string}>;
            
            const { start, end, clubId } = timeSlotTiming[0];
            
            // 1. Buscar pistas ocupadas por OTRAS CLASES en el mismo horario
            const occupiedByClasses = await prisma.$queryRaw`
              SELECT courtNumber FROM TimeSlot 
              WHERE clubId = ${clubId}
              AND start = ${start}
              AND courtNumber IS NOT NULL
              AND id != ${timeSlotId}
              GROUP BY courtNumber
            ` as Array<{courtNumber: number}>;
            
            // 2. Buscar pistas bloqueadas en CourtSchedule
            const occupiedBySchedule = await prisma.$queryRaw`
              SELECT c.number as courtNumber
              FROM CourtSchedule cs
              JOIN Court c ON cs.courtId = c.id
              WHERE c.clubId = ${clubId}
              AND cs.isOccupied = 1
              AND cs.startTime <= ${start}
              AND cs.endTime >= ${end}
            ` as Array<{courtNumber: number}>;
            
            // Combinar ambas listas de pistas ocupadas
            const occupiedCourtNumbers = [
              ...occupiedByClasses.map(c => c.courtNumber),
              ...occupiedBySchedule.map(c => c.courtNumber)
            ];
            
            console.log(`   🔍 Occupied courts at ${start}:`, occupiedCourtNumbers);
            
            // Obtener el número total de pistas del club
            const clubCourts = await prisma.$queryRaw`
              SELECT number FROM Court 
              WHERE clubId = ${clubId}
              AND isActive = 1
              ORDER BY number ASC
            ` as Array<{number: number}>;
            
            const totalCourts = clubCourts.length;
            console.log(`   🏟️ Total courts in club: ${totalCourts}`);
            console.log(`   🏟️ Available court numbers:`, clubCourts.map(c => c.number));
            
            // Encontrar la primera pista disponible
            for (const court of clubCourts) {
              if (!occupiedCourtNumbers.includes(court.number)) {
                courtAssigned = court.number;
                console.log(`   ✅ Assigning first available court: ${courtAssigned}`);
                break;
              }
            }
            
            if (!courtAssigned) {
              console.log(`   ⚠️ NO AVAILABLE COURTS! All ${totalCourts} courts are occupied at ${start}`);
              console.log(`   ⚠️ Occupied courts:`, occupiedCourtNumbers);
              // No asignar pista si no hay disponible
              // Las reservas se mantienen pero la clase queda pendiente de pista
            } else {
              // Obtener el courtId de la pista asignada
              const courtInfo = await prisma.$queryRaw`
                SELECT id FROM Court WHERE number = ${courtAssigned} AND clubId = 'club-1' LIMIT 1
              ` as Array<{id: string}>;
              
              const assignedCourtId = courtInfo && courtInfo.length > 0 ? courtInfo[0].id : null;
              
              // Actualizar el TimeSlot con la pista asignada (courtId Y courtNumber)
              await prisma.$executeRaw`
                UPDATE TimeSlot 
                SET courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
                WHERE id = ${timeSlotId}
              `;
              
              console.log(`   ✅ Court ${courtAssigned} (ID: ${assignedCourtId}) assigned to TimeSlot ${timeSlotId}`);

              // 🗑️ ELIMINAR PROPUESTAS DEL SLOT ACTUAL Y LOS 30 MIN SIGUIENTES
              console.log(`   🗑️ Removing proposals for current slot and next 30 minutes...`);
              
              const slotDetailsForDeletion = await prisma.$queryRaw`
                SELECT start, end, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
              ` as Array<{start: string, end: string, instructorId: string}>;
              
              if (slotDetailsForDeletion && slotDetailsForDeletion.length > 0) {
                const { start, end, instructorId } = slotDetailsForDeletion[0];
                
                // Eliminar TODAS las propuestas (courtId = null) del mismo instructor 
                // que empiecen entre el inicio y el fin de esta clase confirmada
                // Ejemplo: Clase confirmada 10:00-11:00 → eliminar propuestas en 10:00 y 10:30
                const deletedProposals = await prisma.$executeRaw`
                  DELETE FROM TimeSlot 
                  WHERE instructorId = ${instructorId}
                  AND courtId IS NULL
                  AND id != ${timeSlotId}
                  AND start >= ${start}
                  AND start < ${end}
                `;
                
                console.log(`      🗑️ Deleted ${deletedProposals} proposal(s) between ${start} and ${end}`);
              }

              // �🚫 CANCELAR RESERVAS DE LAS OPCIONES PERDEDORAS
              console.log(`   🚫 Cancelling bookings for losing options...`);
              
              // Obtener los IDs de las reservas ganadoras (las del groupSize ganador)
              const winningBookingIds = allBookingsForSlot
                .filter(b => b.groupSize === raceWinner)
                .map(b => b.id);
              
              console.log(`   ✅ Winning bookings (${raceWinner} players):`, winningBookingIds.length);
              
              // Cancelar todas las reservas que NO son del grupo ganador
              const losingBookings = allBookingsForSlot.filter(b => b.groupSize !== raceWinner);
              console.log(`   ❌ Losing bookings to cancel:`, losingBookings.length);
              
              for (const booking of losingBookings) {
                await prisma.$executeRaw`
                  UPDATE Booking 
                  SET status = 'CANCELLED', updatedAt = datetime('now')
                  WHERE id = ${booking.id}
                `;
                console.log(`      ❌ Cancelled booking ${booking.id} (${booking.groupSize} players)`);
              }

              // 💰 DEVOLVER CRÉDITOS a los usuarios de las reservas canceladas
              console.log(`   💰 Refunding credits to cancelled bookings...`);
              const timeSlotPrice = await prisma.$queryRaw`
                SELECT totalPrice FROM TimeSlot WHERE id = ${timeSlotId}
              ` as Array<{totalPrice: number}>;
              
              const totalPrice = Number(timeSlotPrice[0]?.totalPrice) || 55;
              
              for (const booking of losingBookings) {
                const refundAmount = totalPrice / Number(booking.groupSize);
                
                await prisma.$executeRaw`
                  UPDATE User 
                  SET credits = credits + ${refundAmount}, updatedAt = datetime('now')
                  WHERE id = ${booking.userId}
                `;
                
                console.log(`      💰 Refunded €${refundAmount.toFixed(2)} to user ${booking.userId}`);
              }

              console.log(`   ✅ Race system completed! Winner: ${raceWinner} player(s), Court: ${courtAssigned}`);

              // 📅 MARCAR CALENDARIOS COMO OCUPADOS
              console.log(`   📅 Marking schedules as occupied...`);
              
              // Obtener info del TimeSlot para los calendarios
              const slotDetailsForSchedules = await prisma.$queryRaw`
                SELECT start, end, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
              ` as Array<{start: string, end: string, instructorId: string}>;
              
              if (slotDetailsForSchedules && slotDetailsForSchedules.length > 0) {
                const { start, end, instructorId } = slotDetailsForSchedules[0];
                const startDate = new Date(start);
                const dateStr = startDate.toISOString().split('T')[0];
                
                // Obtener el courtId de la pista asignada
                const courtInfo = await prisma.$queryRaw`
                  SELECT id FROM Court WHERE number = ${courtAssigned} LIMIT 1
                ` as Array<{id: string}>;
                
                if (courtInfo && courtInfo.length > 0) {
                  const courtId = courtInfo[0].id;
                  
                  // Marcar PISTA como ocupada
                  const courtScheduleId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  await prisma.$executeRaw`
                    INSERT INTO CourtSchedule (
                      id, courtId, date, startTime, endTime, 
                      isOccupied, timeSlotId, reason, createdAt, updatedAt
                    )
                    VALUES (
                      ${courtScheduleId},
                      ${courtId},
                      ${dateStr},
                      ${start},
                      ${end},
                      1,
                      ${timeSlotId},
                      'Clase confirmada',
                      datetime('now'),
                      datetime('now')
                    )
                  `;
                  console.log(`      ✅ Court ${courtAssigned} marked as occupied`);
                }
                
                // Marcar INSTRUCTOR como ocupado
                if (instructorId) {
                  const instructorScheduleId = `is_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  await prisma.$executeRaw`
                    INSERT INTO InstructorSchedule (
                      id, instructorId, date, startTime, endTime,
                      isOccupied, timeSlotId, reason, createdAt, updatedAt
                    )
                    VALUES (
                      ${instructorScheduleId},
                      ${instructorId},
                      ${dateStr},
                      ${start},
                      ${end},
                      1,
                      ${timeSlotId},
                      'Clase asignada',
                      datetime('now'),
                      datetime('now')
                    )
                  `;
                  console.log(`      ✅ Instructor marked as occupied`);
                }
              }
            }
          }
          
          // Solo procesar el primer ganador
          break;
        }
      }

      // 🎯 AUTO-GENERAR NUEVA TARJETA ABIERTA
      await autoGenerateOpenSlot(timeSlotId, prisma);

      return NextResponse.json({
        success: true,
        bookingId,
        message: 'Reserva creada exitosamente',
        classComplete: raceWinner !== null,
        winningOption: raceWinner,
        courtAssigned: courtAssigned
      });



  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
