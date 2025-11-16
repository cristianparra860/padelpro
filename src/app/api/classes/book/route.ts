// API corregida para la estructura real de la BD
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  calculateSlotPrice, 
  hasAvailableCredits, 
  updateUserBlockedCredits,
  grantCompensationPoints
} from '@/lib/blockedCredits';
import { createTransaction } from '@/lib/transactionLogger';

// 🚫 FUNCIÓN PARA CANCELAR OTRAS INSCRIPCIONES DEL MISMO DÍA
async function cancelOtherBookingsOnSameDay(userId: string, confirmedTimeSlotId: string, prisma: any) {
  try {
    console.log(`🔍 Verificando otras inscripciones del usuario ${userId} en el mismo día...`);
    
    // Obtener la fecha del slot confirmado
    const confirmedSlot = await prisma.$queryRaw`
      SELECT start FROM TimeSlot WHERE id = ${confirmedTimeSlotId}
    ` as Array<{ start: number | bigint }>;
    
    if (!confirmedSlot || confirmedSlot.length === 0) {
      console.log('❌ No se pudo obtener información del slot confirmado');
      return;
    }
    
    // Convertir timestamp a fecha (inicio y fin del día)
    const slotTimestamp = Number(confirmedSlot[0].start);
    const slotDate = new Date(slotTimestamp);
    const startOfDay = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate()).getTime();
    const endOfDay = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate(), 23, 59, 59, 999).getTime();
    
    console.log(`📅 Fecha del slot confirmado: ${slotDate.toISOString().split('T')[0]}`);
    console.log(`⏰ Rango del día: ${startOfDay} - ${endOfDay}`);
    
    // Buscar todas las reservas PENDING del usuario en el mismo día (excluyendo la confirmada)
    const otherBookings = await prisma.$queryRaw`
      SELECT b.id, b.userId, b.timeSlotId, b.amountBlocked, ts.start
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status = 'PENDING'
      AND b.timeSlotId != ${confirmedTimeSlotId}
      AND ts.start >= ${startOfDay}
      AND ts.start <= ${endOfDay}
    ` as Array<{ id: string, userId: string, timeSlotId: string, amountBlocked: number | bigint, start: number | bigint }>;
    
    console.log(`📊 Inscripciones pendientes encontradas en el mismo día: ${otherBookings.length}`);
    
    if (otherBookings.length === 0) {
      console.log('✅ No hay otras inscripciones pendientes para cancelar');
      return;
    }
    
    // Cancelar cada inscripción pendiente
    for (const booking of otherBookings) {
      const amountBlocked = Number(booking.amountBlocked);
      const bookingTime = new Date(Number(booking.start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`   ❌ Cancelando inscripción ${booking.id} (${bookingTime}) - Desbloquear €${(amountBlocked/100).toFixed(2)}`);
      
      // Cambiar estado a CANCELLED
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CANCELLED', updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      
      // Desbloquear créditos
      await updateUserBlockedCredits(userId);
      
      // Registrar transacción de desbloqueo
      const userAfter = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, blockedCredits: true }
      });
      
      if (userAfter) {
        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: amountBlocked,
          balance: userAfter.credits,
          concept: `Inscripción cancelada automáticamente - Ya tienes una reserva confirmada este día`,
          relatedId: booking.id,
          relatedType: 'booking',
          metadata: {
            timeSlotId: booking.timeSlotId,
            reason: 'one_reservation_per_day',
            confirmedTimeSlotId
          }
        });
      }
    }
    
    console.log(`✅ ${otherBookings.length} inscripción(es) cancelada(s) automáticamente`);
    
  } catch (error) {
    console.error('❌ Error cancelando otras inscripciones del mismo día:', error);
    // No fallar la reserva principal por este error
  }
}

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
    console.log('');
    console.log('='.repeat(80));
    console.log('🎯 POST /api/classes/book - NUEVA PETICIÓN DE RESERVA');
    console.log('='.repeat(80));
    
    const body = await request.json();
    console.log('📝 Body received:', JSON.stringify(body, null, 2));
    
    const { userId, timeSlotId, groupSize = 1 } = body;
    console.log('🔍 Extracted values:', { userId, timeSlotId, groupSize, typeOfGroupSize: typeof groupSize });

    if (!userId || !timeSlotId) {
      return NextResponse.json({ error: 'Missing userId or timeSlotId' }, { status: 400 });
    }

    // Verificar que el timeSlot existe y obtener sus detalles
    const slotDetails = await prisma.$queryRaw`
      SELECT id, start, end, clubId, instructorId, totalPrice FROM TimeSlot WHERE id = ${timeSlotId}
    ` as Array<{id: string, start: string | number, end: string | number, clubId: string, instructorId: string, totalPrice: number}>;

    if (!slotDetails || slotDetails.length === 0) {
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

      // 🚫 VALIDAR: No puede inscribirse si ya tiene una reserva CONFIRMADA ese día
      const slotTimestamp = typeof slotDetails[0].start === 'bigint' ? Number(slotDetails[0].start) : typeof slotDetails[0].start === 'number' ? slotDetails[0].start : new Date(slotDetails[0].start).getTime();
      const slotDate = new Date(slotTimestamp);
      const startOfDay = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate()).getTime();
      const endOfDay = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate(), 23, 59, 59, 999).getTime();
      
      const confirmedBookingsToday = await prisma.$queryRaw`
        SELECT b.id, ts.start
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${userId}
        AND b.status = 'CONFIRMED'
        AND ts.start >= ${startOfDay}
        AND ts.start <= ${endOfDay}
      ` as Array<{ id: string, start: number | bigint }>;
      
      if (confirmedBookingsToday.length > 0) {
        const confirmedTime = new Date(Number(confirmedBookingsToday[0].start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return NextResponse.json({ 
          error: `Ya tienes una reserva confirmada este día a las ${confirmedTime}. Solo puedes tener una reserva confirmada por día.` 
        }, { status: 400 });
      }

      // 🚫 VALIDAR: No puede inscribirse en otra tarjeta del mismo día/hora/instructor
      const slotInstructorId = slotDetails[0].instructorId;
      const slotStartTime = slotTimestamp;
      
      const existingBookingSameTimeInstructor = await prisma.$queryRaw`
        SELECT b.id, ts.id as timeSlotId, ts.start
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${userId}
        AND b.status IN ('PENDING', 'CONFIRMED')
        AND ts.instructorId = ${slotInstructorId}
        AND ts.start = ${slotStartTime}
        AND b.timeSlotId != ${timeSlotId}
      ` as Array<{ id: string, timeSlotId: string, start: number | bigint }>;
      
      if (existingBookingSameTimeInstructor.length > 0) {
        const existingTime = new Date(Number(existingBookingSameTimeInstructor[0].start)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return NextResponse.json({ 
          error: `Ya tienes una inscripción con este instructor a las ${existingTime}. No puedes inscribirte en múltiples grupos de la misma clase.` 
        }, { status: 400 });
      }

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

      // 💰 OBTENER PRECIO DEL TIMESLOT Y VERIFICAR SALDO DISPONIBLE
      const priceInfo = await prisma.$queryRaw`
        SELECT totalPrice FROM TimeSlot WHERE id = ${timeSlotId}
      `;

      if (!priceInfo || (priceInfo as any[]).length === 0) {
        return NextResponse.json({ error: 'No se pudo obtener información del precio' }, { status: 500 });
      }

      const totalPrice = Number((priceInfo as any[])[0].totalPrice) || 55;
      const pricePerSlot = calculateSlotPrice(totalPrice, Number(groupSize) || 1);

      console.log(`💰 Precio total: €${totalPrice}, Precio por grupo (${groupSize} jugadores): €${(pricePerSlot/100).toFixed(2)}`);

      // Verificar saldo disponible (no bloqueado)
      const hasCredits = await hasAvailableCredits(userId, pricePerSlot);
      
      if (!hasCredits) {
        const userInfo = await prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true, blockedCredits: true }
        });
        
        const available = (userInfo!.credits - userInfo!.blockedCredits) / 100;
        const required = pricePerSlot / 100;
        
        console.log(`❌ Saldo insuficiente: necesita €${required.toFixed(2)}, disponible €${available.toFixed(2)}`);
        return NextResponse.json({ 
          error: `Saldo insuficiente`,
          details: `Necesitas €${required.toFixed(2)} disponibles pero solo tienes €${available.toFixed(2)}. Por favor, recarga tu saldo.`,
          required: required,
          available: available,
          missing: required - available
        }, { status: 400 });
      }

      console.log(`✅ Saldo disponible verificado: €${(pricePerSlot/100).toFixed(2)}`);

      console.log(`✅ Saldo disponible verificado: €${(pricePerSlot/100).toFixed(2)}`);

      // NO descontar el saldo aún - solo crear booking PENDING

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

      // Crear la reserva como PENDING con amountBlocked
      const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await prisma.$executeRaw`
        INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, amountBlocked, paidWithPoints, pointsUsed, isRecycled, createdAt, updatedAt)
        VALUES (${bookingId}, ${userId}, ${timeSlotId}, ${Number(groupSize) || 1}, 'PENDING', ${pricePerSlot}, 0, 0, 0, datetime('now'), datetime('now'))
      `;

      console.log('✅ Booking created successfully:', bookingId);

      // 🔒 ACTUALIZAR SALDO BLOQUEADO DEL USUARIO
      const newBlockedAmount = await updateUserBlockedCredits(userId);
      console.log(`🔒 Usuario blockedCredits actualizado: €${(newBlockedAmount/100).toFixed(2)}`);

      // 📝 REGISTRAR TRANSACCIÓN DE BLOQUEO
      const userBalance = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, blockedCredits: true }
      });
      
      if (userBalance) {
        await createTransaction({
          userId,
          type: 'credit',
          action: 'block',
          amount: pricePerSlot,
          balance: userBalance.credits - userBalance.blockedCredits,
          concept: `Reserva pendiente - Clase ${new Date(slotDetails[0].start).toLocaleString('es-ES')}`,
          relatedId: bookingId,
          relatedType: 'booking',
          metadata: {
            timeSlotId,
            groupSize,
            status: 'PENDING'
          }
        });
      }

      // 🏷️ ESTABLECER CATEGORÍA DEL TIMESLOT basada en el primer jugador
      if (isFirstBooking) {
        console.log('🏷️ This is the FIRST booking for this TimeSlot, setting category...');
        
        // Obtener el género del usuario (masculino/femenino)
        const userInfo = await prisma.$queryRaw`
          SELECT gender FROM User WHERE id = ${userId}
        ` as Array<{gender: string | null}>;
        
        // Convertir género a categoría de clase
        const userGender = userInfo[0]?.gender; // "masculino" o "femenino"
        const classCategory = userGender === 'masculino' ? 'masculino' : 
                            userGender === 'femenino' ? 'femenino' : 
                            'mixto';
        
        console.log(`   👤 User gender: ${userGender} → Class category: ${classCategory}`);
        
        // Actualizar el TimeSlot con la categoría del primer jugador
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET genderCategory = ${classCategory}, updatedAt = datetime('now')
          WHERE id = ${timeSlotId}
        `;
        
        console.log(`   ✅ TimeSlot category set to: ${classCategory}`);

        // 🆕 CREAR NUEVA TARJETA ABIERTA para permitir competencia de otros grupos
        console.log('🆕 Creating NEW open slot for other users to compete...');
        
        try {
          // Obtener información del TimeSlot original
          const originalSlot = await prisma.$queryRaw`
            SELECT start, end, clubId, instructorId, maxPlayers, totalPrice, 
                   instructorPrice, courtRentalPrice, category
            FROM TimeSlot 
            WHERE id = ${timeSlotId}
          ` as Array<{
            start: number | bigint,
            end: number | bigint,
            clubId: string,
            instructorId: string,
            maxPlayers: number,
            totalPrice: number,
            instructorPrice: number,
            courtRentalPrice: number,
            category: string
          }>;

          if (originalSlot.length > 0) {
            const slot = originalSlot[0];
            
            // Crear nueva tarjeta con nivel ABIERTO y categoría mixto
            const newSlot = await prisma.timeSlot.create({
              data: {
                clubId: slot.clubId,
                instructorId: slot.instructorId,
                start: new Date(Number(slot.start)),
                end: new Date(Number(slot.end)),
                maxPlayers: slot.maxPlayers,
                totalPrice: slot.totalPrice,
                instructorPrice: slot.instructorPrice,
                courtRentalPrice: slot.courtRentalPrice,
                level: 'ABIERTO', // Siempre abierto
                genderCategory: 'mixto', // Siempre mixto
                category: slot.category,
                courtId: null, // Sin pista asignada (propuesta)
                courtNumber: null
              }
            });

            console.log(`   ✅ New open slot created: ${newSlot.id}`);
            console.log(`   📋 Same instructor & time, but level=ABIERTO, category=mixto`);
          }
        } catch (createError) {
          console.error('   ⚠️ Error creating new open slot:', createError);
          // No fallar la reserva principal si esto falla
        }
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
            
            // 1. Buscar pistas ocupadas por OTRAS CLASES que se solapen con este horario
            // Una clase solapa SI: su inicio es antes del fin de esta Y su fin es después del inicio de esta
            const occupiedByClasses = await prisma.$queryRaw`
              SELECT courtNumber FROM TimeSlot 
              WHERE clubId = ${clubId}
              AND courtNumber IS NOT NULL
              AND id != ${timeSlotId}
              AND start < ${end}
              AND end > ${start}
              GROUP BY courtNumber
            ` as Array<{courtNumber: number}>;
            
            // 2. Buscar pistas bloqueadas en CourtSchedule que se solapen con este horario
            const occupiedBySchedule = await prisma.$queryRaw`
              SELECT c.number as courtNumber
              FROM CourtSchedule cs
              JOIN Court c ON cs.courtId = c.id
              WHERE c.clubId = ${clubId}
              AND cs.isOccupied = 1
              AND cs.startTime < ${end}
              AND cs.endTime > ${start}
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
              // Obtener el courtId de la pista asignada (usar el clubId real del TimeSlot)
              const courtInfo = await prisma.$queryRaw`
                SELECT id FROM Court WHERE number = ${courtAssigned} AND clubId = ${clubId} LIMIT 1
              ` as Array<{id: string}>;
              
              const assignedCourtId = courtInfo && courtInfo.length > 0 ? courtInfo[0].id : null;
              
              // Actualizar el TimeSlot con la pista asignada (la categoría ya debería estar desde la primera reserva)
              await prisma.$executeRaw`
                UPDATE TimeSlot 
                SET courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
                WHERE id = ${timeSlotId}
              `;
              
              console.log(`   ✅ Court ${courtAssigned} (ID: ${assignedCourtId}) assigned to TimeSlot ${timeSlotId}`);

              // 🗑️ ELIMINAR SOLO PROPUESTAS DENTRO DE LA CLASE CONFIRMADA
              console.log(`   🗑️ Removing proposals inside the confirmed class...`);
              
              const slotDetailsForDeletion = await prisma.$queryRaw`
                SELECT start, end, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
              ` as Array<{start: string, end: string, instructorId: string}>;
              
              // ✅ NO ELIMINAMOS PROPUESTAS 30MIN ANTES
              // Las propuestas conflictivas quedan disponibles en el calendario
              // pero el sistema de validación de InstructorSchedule las bloquea automáticamente
              // Esto permite que al cancelar, las propuestas sigan existiendo
              console.log(`      ℹ️ Propuestas conflictivas quedan disponibles (bloqueadas por InstructorSchedule)`);

              // 🚫 CANCELAR RESERVAS DE LAS OPCIONES PERDEDORAS
              console.log(`   🚫 Cancelling bookings for losing options...`);
              
              // Obtener los IDs de las reservas ganadoras (las del groupSize ganador)
              const winningBookingIds = allBookingsForSlot
                .filter(b => b.groupSize === raceWinner)
                .map(b => b.id);
              
              console.log(`   ✅ Winning bookings (${raceWinner} players):`, winningBookingIds.length);
              
              // ✅ CONFIRMAR Y COBRAR RESERVAS GANADORAS
              console.log(`   💳 Confirming and charging winning bookings...`);
              const winningBookings = allBookingsForSlot.filter(b => b.groupSize === raceWinner);
              
              for (const booking of winningBookings) {
                // Obtener el monto bloqueado del booking
                const bookingInfo = await prisma.booking.findUnique({
                  where: { id: booking.id },
                  select: { amountBlocked: true, userId: true }
                });
                
                const amountToCharge = bookingInfo?.amountBlocked || 0;
                
                // Obtener balance actual antes de cobrar
                const userBeforeCharge = await prisma.user.findUnique({
                  where: { id: booking.userId },
                  select: { credits: true, blockedCredits: true }
                });
                
                // Cobrar del saldo real
                await prisma.$executeRaw`
                  UPDATE User 
                  SET credits = credits - ${amountToCharge}, updatedAt = datetime('now')
                  WHERE id = ${booking.userId}
                `;
                
                // Actualizar booking a CONFIRMED
                await prisma.$executeRaw`
                  UPDATE Booking 
                  SET status = 'CONFIRMED', updatedAt = datetime('now')
                  WHERE id = ${booking.id}
                `;
                
                // Actualizar blockedCredits del usuario (recalcular)
                await updateUserBlockedCredits(booking.userId);
                
                // 📝 REGISTRAR TRANSACCIÓN DE COBRO
                if (userBeforeCharge) {
                  const newBalance = userBeforeCharge.credits - amountToCharge;
                  await createTransaction({
                    userId: booking.userId,
                    type: 'credit',
                    action: 'subtract',
                    amount: amountToCharge,
                    balance: newBalance,
                    concept: `Clase confirmada - ${new Date(slotDetails[0].start).toLocaleString('es-ES')}`,
                    relatedId: booking.id,
                    relatedType: 'booking',
                    metadata: {
                      timeSlotId,
                      groupSize: booking.groupSize,
                      status: 'CONFIRMED',
                      courtNumber: courtAssigned
                    }
                  });
                }
                
                console.log(`      ✅ Confirmed and charged €${(amountToCharge/100).toFixed(2)} to user ${booking.userId}`);
                
                // 🚫 CANCELAR OTRAS INSCRIPCIONES DEL MISMO DÍA
                await cancelOtherBookingsOnSameDay(booking.userId, timeSlotId, prisma);
              }
              
              // Cancelar todas las reservas que NO son del grupo ganador
              const losingBookings = allBookingsForSlot.filter(b => b.groupSize !== raceWinner);
              console.log(`   ❌ Losing bookings to cancel:`, losingBookings.length);
              
              for (const booking of losingBookings) {
                // Obtener el monto que estaba bloqueado
                const bookingInfo = await prisma.booking.findUnique({
                  where: { id: booking.id },
                  select: { amountBlocked: true, userId: true, status: true }
                });
                
                const amountBlocked = bookingInfo?.amountBlocked || 0;
                const wasConfirmed = bookingInfo?.status === 'CONFIRMED';
                
                await prisma.$executeRaw`
                  UPDATE Booking 
                  SET status = 'CANCELLED', updatedAt = datetime('now')
                  WHERE id = ${booking.id}
                `;
                
                if (wasConfirmed) {
                  // 🎁 CLASE CONFIRMADA CANCELADA POR CARRERA - Otorgar puntos de compensación
                  const newPoints = await grantCompensationPoints(booking.userId, amountBlocked);
                  const pointsGranted = Math.floor(amountBlocked / 100);
                  
                  console.log(`      🎁 Booking confirmado cancelado - Otorgados ${pointsGranted} puntos de compensación al usuario ${booking.userId}`);
                  
                  // Registrar transacción de puntos
                  await createTransaction({
                    userId: booking.userId,
                    type: 'points',
                    action: 'add',
                    amount: pointsGranted,
                    balance: newPoints,
                    concept: `Compensación por cancelación - Otra modalidad completó primero`,
                    relatedId: booking.id,
                    relatedType: 'booking',
                    metadata: {
                      timeSlotId,
                      groupSize: booking.groupSize,
                      status: 'CANCELLED',
                      reason: 'Clase confirmada cancelada - Otra modalidad ganó la carrera',
                      originalAmount: amountBlocked
                    }
                  });
                } else {
                  // CLASE PENDIENTE - Solo desbloquear créditos
                  await updateUserBlockedCredits(booking.userId);
                  
                  // 📝 REGISTRAR TRANSACCIÓN DE DESBLOQUEO
                  const userAfterUnblock = await prisma.user.findUnique({
                    where: { id: booking.userId },
                    select: { credits: true, blockedCredits: true }
                  });
                  
                  if (userAfterUnblock) {
                    await createTransaction({
                      userId: booking.userId,
                      type: 'credit',
                      action: 'unblock',
                      amount: amountBlocked,
                      balance: userAfterUnblock.credits - userAfterUnblock.blockedCredits,
                      concept: `Reserva cancelada - Opción ${booking.groupSize} jugadores no completada`,
                      relatedId: booking.id,
                      relatedType: 'booking',
                      metadata: {
                        timeSlotId,
                        groupSize: booking.groupSize,
                        status: 'CANCELLED',
                        reason: 'Otra modalidad ganó la carrera'
                      }
                    });
                  }
                }
                
                console.log(`      ❌ Cancelled booking ${booking.id} (${booking.groupSize} players) - blockedCredits updated`);
              }

              // NO es necesario devolver créditos ya que nunca se cobraron (solo estaban bloqueados)
              console.log(`   ✅ Losing bookings cancelled and blockedCredits updated`);

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

      console.log('');
      console.log('✅✅✅ RESERVA CREADA EXITOSAMENTE ✅✅✅');
      console.log('📋 Booking ID:', bookingId);
      console.log('👤 Usuario:', userId);
      console.log('📅 TimeSlot:', timeSlotId);
      console.log('🎮 Group Size:', groupSize);
      console.log('💰 Monto bloqueado:', pricePerSlot / 100, '€');
      console.log('='.repeat(80));
      console.log('');

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
