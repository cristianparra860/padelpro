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

// 🎯 FUNCIÓN PARA ENCONTRAR EL RANGO DE NIVEL CORRESPONDIENTE
function findLevelRange(userLevel: number, instructorRanges: Array<{minLevel: number, maxLevel: number}>): string | null {
  if (!instructorRanges || instructorRanges.length === 0) {
    return null;
  }
  
  const matchingRange = instructorRanges.find(range => 
    userLevel >= range.minLevel && userLevel <= range.maxLevel
  );
  
  return matchingRange ? `${matchingRange.minLevel}-${matchingRange.maxLevel}` : null;
}

// 🚫 FUNCIÓN PARA CANCELAR OTRAS INSCRIPCIONES DEL MISMO DÍA
async function cancelOtherBookingsOnSameDay(userId: string, confirmedTimeSlotId: string, prisma: any) {
  try {
    console.log(`🔍 Verificando otras inscripciones del usuario ${userId} en el mismo día...`);
    
    // Obtener la fecha del slot confirmado
    const confirmedSlot = await prisma.$queryRaw`
      SELECT start FROM TimeSlot WHERE id = ${confirmedTimeSlotId}
    ` as Array<{ start: string }>;
    
    if (!confirmedSlot || confirmedSlot.length === 0) {
      console.log('❌ No se pudo obtener información del slot confirmado');
      return;
    }
    
    // Convertir a fecha y calcular inicio/fin del día en formato ISO
    const slotDate = new Date(confirmedSlot[0].start);
    const startOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 23, 59, 59, 999));
    const startOfDay = startOfDayDate.toISOString();
    const endOfDay = endOfDayDate.toISOString();
    
    console.log(`📅 Fecha del slot confirmado: ${slotDate.toISOString().split('T')[0]}`);
    console.log(`⏰ Rango del día: ${startOfDay} - ${endOfDay}`);
    
    // 🚨🚨🚨 NORMA CRÍTICA #1: MÁXIMO UNA RESERVA CONFIRMADA POR DÍA 🚨🚨🚨
    // Una RESERVA es cuando la clase está completa Y tiene pista asignada (status = CONFIRMED)
    // Cuando se confirma una reserva, se deben ELIMINAR todas las INSCRIPCIONES del usuario:
    // 1. Otras reservas CONFIRMED del mismo día (no debería pasar, pero por seguridad)
    // 2. Inscripciones PENDING (clases incompletas sin pista asignada)
    
    const otherBookings = await prisma.$queryRaw`
      SELECT b.id, b.userId, b.timeSlotId, b.amountBlocked, b.status, ts.start, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status IN ('PENDING', 'CONFIRMED')
      AND b.timeSlotId != ${confirmedTimeSlotId}
      AND ts.start >= ${startOfDay}
      AND ts.start <= ${endOfDay}
    ` as Array<{ id: string, userId: string, timeSlotId: string, amountBlocked: number | bigint, status: string, start: string, courtNumber: number | null }>;
    
    console.log(`📊 Otras inscripciones/reservas encontradas en el mismo día: ${otherBookings.length}`);
    console.log(`   - PENDING (inscripciones sin pista): ${otherBookings.filter(b => b.status === 'PENDING').length}`);
    console.log(`   - CONFIRMED (reservas con pista): ${otherBookings.filter(b => b.status === 'CONFIRMED').length}`);
    
    if (otherBookings.length === 0) {
      console.log('✅ No hay otras inscripciones/reservas para cancelar');
      return;
    }
    
    // 🔥 CANCELAR CADA INSCRIPCIÓN/RESERVA (PENDING Y CONFIRMED)
    for (const booking of otherBookings) {
      const amountBlocked = Number(booking.amountBlocked);
      const bookingTime = new Date(booking.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const isPending = booking.status === 'PENDING';
      const hasNoCourt = booking.courtNumber === null;
      
      if (isPending && hasNoCourt) {
        console.log(`   🗑️ ELIMINANDO inscripción PENDIENTE sin pista ${booking.id} (${bookingTime}) - Liberar €${(amountBlocked/100).toFixed(2)}`);
      } else if (booking.status === 'CONFIRMED') {
        console.log(`   ❌ CANCELANDO reserva CONFIRMADA ${booking.id} (${bookingTime}) - Compensación €${(amountBlocked/100).toFixed(2)}`);
      } else {
        console.log(`   ❌ CANCELANDO inscripción ${booking.id} (${bookingTime})`);
      }
      
      // Cambiar estado a CANCELLED
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CANCELLED', updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      
      // Si la reserva estaba CONFIRMED, otorgar puntos de compensación
      if (booking.status === 'CONFIRMED') {
        const pointsGranted = Math.floor(amountBlocked / 100);
        console.log(`      🎁 Reserva confirmada cancelada - Otorgando ${pointsGranted} puntos de compensación`);
        
        await grantCompensationPoints(userId, amountBlocked);
        
        await createTransaction({
          userId,
          type: 'points',
          action: 'add',
          amount: pointsGranted,
          balance: 0, // Se actualizará después
          concept: `Compensación: Reserva cancelada automáticamente - Solo 1 reserva confirmada por día`,
          relatedId: booking.id,
          relatedType: 'booking',
          metadata: {
            timeSlotId: booking.timeSlotId,
            reason: 'one_booking_per_day_rule',
            originalAmount: amountBlocked
          }
        });
      } else {
        // Para inscripciones PENDING, registrar el desbloqueo
        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: amountBlocked,
          balance: 0, // Se actualizará después
          concept: `Inscripción cancelada automáticamente - Ya tienes una reserva confirmada hoy a las ${new Date(confirmedSlot[0].start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
          relatedId: booking.id,
          relatedType: 'booking',
          metadata: {
            timeSlotId: booking.timeSlotId,
            reason: 'one_booking_per_day_rule',
            isPending: true,
            confirmedTimeSlotId
          }
        });
      }
      
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
    
    const { userId, timeSlotId, groupSize = 1, isPrivate = false, usePoints = false } = body;
    console.log('🔍 Extracted values:', { userId, timeSlotId, groupSize, isPrivate, usePoints, typeOfGroupSize: typeof groupSize });
    console.log('🆔 USER ID RECIBIDO:', userId);
    console.log('📧 USER EMAIL RECIBIDO:', body.userEmail);
    console.log('👤 USER NAME RECIBIDO:', body.userName);
    console.log('🎫 RESERVA PRIVADA:', isPrivate);
    console.log('💰 PAGO CON PUNTOS:', usePoints);
    
    // ⚠️ VERIFICACIÓN DE SEGURIDAD: Asegurar que el userId no es Alex García por error
    if (userId === 'cmhkwi8so0001tggo0bwojrjy') {
      console.log('⚠️⚠️⚠️ ALERTA: Se está intentando reservar con Alex García!');
      console.log('⚠️ Este podría ser un error si el usuario real es otro');
    }

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

      // 🚨🚨🚨 NORMA #1: MÁXIMO UNA RESERVA CONFIRMADA POR DÍA 🚨🚨🚨
      // Una RESERVA es cuando la clase está completa Y tiene pista asignada (CONFIRMED)
      // Las inscripciones PENDING (sin pista) se permiten hasta que se confirme una
      const slotTimestamp = typeof slotDetails[0].start === 'bigint' ? Number(slotDetails[0].start) : typeof slotDetails[0].start === 'number' ? slotDetails[0].start : new Date(slotDetails[0].start).getTime();
      const slotDate = new Date(slotTimestamp);
      
      // Calcular inicio y fin del día en formato ISO string (para SQLite)
      const startOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0));
      const endOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 23, 59, 59, 999));
      const startOfDay = startOfDayDate.toISOString();
      const endOfDay = endOfDayDate.toISOString();
      
      console.log(`🔍 Verificando reservas confirmadas del día ${slotDate.toISOString().split('T')[0]}`);
      console.log(`   Rango: ${startOfDay} - ${endOfDay}`);
      
      const confirmedBookingsToday = await prisma.$queryRaw`
        SELECT b.id, ts.start, ts.courtNumber
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${userId}
        AND b.status = 'CONFIRMED'
        AND ts.start >= ${startOfDay}
        AND ts.start <= ${endOfDay}
      ` as Array<{ id: string, start: string, courtNumber: number }>;
      
      console.log(`   📊 Reservas confirmadas (con pista asignada) encontradas: ${confirmedBookingsToday.length}`);
      
      if (confirmedBookingsToday.length > 0) {
        const confirmedDate = new Date(confirmedBookingsToday[0].start);
        const confirmedTime = confirmedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const courtNumber = confirmedBookingsToday[0].courtNumber;
        console.log(`   ❌ BLOQUEADO: Ya tiene reserva confirmada (Pista ${courtNumber}) a las ${confirmedTime}`);
        return NextResponse.json({ 
          error: `⚠️ Ya tienes una reserva confirmada este día a las ${confirmedTime} (Pista ${courtNumber}).\n\n📋 NORMA: Solo puedes tener UNA reserva confirmada (clase completa + pista asignada) por día.\n\n💡 Tus inscripciones en otras clases incompletas se cancelarán automáticamente cuando tu reserva se confirme.` 
        }, { status: 400 });
      }
      
      console.log(`   ✅ No hay reservas confirmadas este día, puede inscribirse`);

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
      
      // 🎫 RESERVA PRIVADA: Usuario paga el precio total completo
      // 🎯 RESERVA NORMAL: Usuario paga precio dividido por número de jugadores
      const pricePerSlot = isPrivate 
        ? totalPrice  // Reserva privada = precio total
        : calculateSlotPrice(totalPrice, Number(groupSize) || 1); // Reserva normal = precio dividido

      console.log(`💰 Precio total: €${totalPrice}, ${isPrivate ? 'RESERVA PRIVADA' : `Precio por grupo (${groupSize} jugadores)`}: €${pricePerSlot.toFixed(2)}`);

      // 💰 VERIFICAR MÉTODO DE PAGO: PUNTOS O CRÉDITOS
      if (usePoints) {
        // 🎯 PAGO CON PUNTOS
        console.log('💰 Verificando saldo de PUNTOS para pago...');
        
        const userInfo = await prisma.user.findUnique({
          where: { id: userId },
          select: { points: true }
        });
        
        const pointsRequired = Math.floor(pricePerSlot); // 1 punto = €1
        const pointsAvailable = userInfo?.points || 0;
        
        console.log(`💎 Puntos requeridos: ${pointsRequired}, Puntos disponibles: ${pointsAvailable}`);
        
        if (pointsAvailable < pointsRequired) {
          console.log(`❌ Puntos insuficientes: necesita ${pointsRequired}, disponible ${pointsAvailable}`);
          return NextResponse.json({ 
            error: `Puntos insuficientes`,
            details: `Necesitas ${pointsRequired} puntos pero solo tienes ${pointsAvailable}. Las plazas recicladas solo se pueden reservar con puntos.`,
            required: pointsRequired,
            available: pointsAvailable,
            missing: pointsRequired - pointsAvailable
          }, { status: 400 });
        }
        
        console.log(`✅ Puntos suficientes verificados: ${pointsRequired} puntos`);
        
      } else {
        // 💳 PAGO CON CRÉDITOS (NORMAL)
        console.log('💳 Verificando saldo de CRÉDITOS para pago...');
        
        const hasCredits = await hasAvailableCredits(userId, pricePerSlot);
        
        if (!hasCredits) {
          const userInfo = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true, blockedCredits: true }
          });
          
          const available = userInfo!.credits - userInfo!.blockedCredits;
          const required = pricePerSlot;
          
          console.log(`❌ Saldo insuficiente: necesita €${required.toFixed(2)}, disponible €${available.toFixed(2)}`);
          return NextResponse.json({ 
            error: `Saldo insuficiente`,
            details: `Necesitas €${required.toFixed(2)} disponibles pero solo tienes €${available.toFixed(2)}. Por favor, recarga tu saldo.`,
            required: required,
            available: available,
            missing: required - available
          }, { status: 400 });
        }

        console.log(`✅ Saldo disponible verificado: €${pricePerSlot.toFixed(2)}`);
      }

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

      // 🚨 VALIDAR QUE NO EXISTA UNA RESERVA ACTIVA DEL MISMO USUARIO/SLOT/GROUPSIZE
      const duplicateBooking = await prisma.$queryRaw`
        SELECT id
        FROM Booking 
        WHERE userId = ${userId}
        AND timeSlotId = ${timeSlotId}
        AND groupSize = ${Number(groupSize) || 1}
        AND status IN ('PENDING', 'CONFIRMED')
        LIMIT 1
      ` as Array<{id: string}>;

      if (duplicateBooking.length > 0) {
        console.log(`❌ Ya existe una reserva activa: ${duplicateBooking[0].id}`);
        return NextResponse.json({ 
          error: 'Ya tienes una reserva activa en esta clase con este número de jugadores' 
        }, { status: 400 });
      }

      // Crear la reserva como PENDING con amountBlocked
      const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 💰 Calcular valores según método de pago
      const pointsToUse = usePoints ? Math.floor(pricePerSlot) : 0;
      const amountToBlock = usePoints ? 0 : pricePerSlot; // Si paga con puntos, no bloqueamos créditos
      
      console.log(`💎 Creando booking: paidWithPoints=${usePoints ? 1 : 0}, pointsUsed=${pointsToUse}, amountBlocked=${amountToBlock}`);
      
      await prisma.$executeRaw`
        INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, amountBlocked, paidWithPoints, pointsUsed, isRecycled, createdAt, updatedAt)
        VALUES (${bookingId}, ${userId}, ${timeSlotId}, ${Number(groupSize) || 1}, 'PENDING', ${amountToBlock}, ${usePoints ? 1 : 0}, ${pointsToUse}, 0, datetime('now'), datetime('now'))
      `;
      
      // 💰 Si paga con puntos, descontar inmediatamente (no se bloquea, se consume)
      if (usePoints) {
        console.log(`💎 Descontando ${pointsToUse} puntos del usuario...`);
        await prisma.$executeRaw`
          UPDATE User
          SET points = points - ${pointsToUse}, updatedAt = datetime('now')
          WHERE id = ${userId}
        `;
        console.log(`✅ ${pointsToUse} puntos descontados exitosamente`);
      }

      console.log('✅ Booking created successfully:', bookingId);

      // 🔒 ACTUALIZAR SALDO BLOQUEADO DEL USUARIO (solo si paga con créditos)
      if (!usePoints) {
        const newBlockedAmount = await updateUserBlockedCredits(userId);
        console.log(`🔒 Usuario blockedCredits actualizado: €${(newBlockedAmount/100).toFixed(2)}`);
      }

      // 📝 REGISTRAR TRANSACCIÓN (créditos bloqueados o puntos descontados)
      const userBalance = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, blockedCredits: true, points: true }
      });
      
      if (userBalance) {
        if (usePoints) {
          // Transacción de puntos
          await createTransaction({
            userId,
            type: 'points',
            action: 'deduct',
            amount: pointsToUse,
            balance: userBalance.points - pointsToUse,
            concept: `Reserva con puntos - Clase ${new Date(slotDetails[0].start).toLocaleString('es-ES')}`,
            relatedId: bookingId,
            relatedType: 'booking',
            metadata: {
              timeSlotId,
              groupSize,
              status: 'PENDING',
              paidWithPoints: true,
              pointsUsed: pointsToUse
            }
          });
        } else {
          // Transacción de bloqueo de créditos
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
      }

      // 🏷️ CLASIFICAR Y CREAR DUPLICADA EN EL PRIMER BOOKING
      // REGLA CRÍTICA: La primera persona que se inscribe determina la categoría (masculino/femenino/mixto)
      console.log(`🔍 isFirstBooking = ${isFirstBooking}`);
      
      if (isFirstBooking) {
        console.log('🏷️ ===== FIRST BOOKING DETECTED =====');
        console.log('🏷️ Classifying TimeSlot based on first user gender and level...');
        
        // Obtener el género, nivel y datos del instructor
        const userInfo = await prisma.$queryRaw`
          SELECT gender, level FROM User WHERE id = ${userId}
        ` as Array<{gender: string | null, level: string | null}>;
        
        const userGender = userInfo[0]?.gender;
        const userLevelStr = userInfo[0]?.level;
        const userLevel = userLevelStr ? parseFloat(userLevelStr) : null;
        const userLevelDisplay = userLevelStr?.toUpperCase() || 'ABIERTO';
        
        console.log(`   👤 Usuario género: ${userGender || 'NO DEFINIDO'}`);
        console.log(`   📊 Usuario nivel: ${userLevelDisplay} (numeric: ${userLevel})`);
        
        // ⚠️ VALIDACIÓN CRÍTICA: El usuario DEBE tener género definido
        if (!userGender || userGender === null) {
          console.log('   ❌ ERROR: Usuario sin género definido');
          
          // Cancelar la reserva recién creada
          await prisma.$executeRaw`
            DELETE FROM Booking WHERE id = ${bookingId}
          `;
          
          // Desbloquear créditos
          await updateUserBlockedCredits(userId);
          
          return NextResponse.json({ 
            error: 'Tu perfil no tiene género definido. Por favor, actualiza tu perfil antes de reservar clases.' 
          }, { status: 400 });
        }
        
        // 🎯 OBTENER RANGOS DE NIVEL DEL INSTRUCTOR
        let levelRange: string | null = null;
        if (userLevel !== null && slotDetails[0].instructorId) {
          const instructorData = await prisma.$queryRaw`
            SELECT levelRanges FROM Instructor WHERE id = ${slotDetails[0].instructorId}
          ` as Array<{levelRanges: string | null}>;
          
          if (instructorData[0]?.levelRanges) {
            try {
              const ranges = JSON.parse(instructorData[0].levelRanges) as Array<{minLevel: number, maxLevel: number}>;
              levelRange = findLevelRange(userLevel, ranges);
              console.log(`   🎯 Rango de nivel encontrado: ${levelRange || 'NINGUNO'}`);
            } catch (e) {
              console.log(`   ⚠️ Error parsing instructor level ranges:`, e);
            }
          } else {
            console.log(`   ℹ️ Instructor no tiene rangos de nivel configurados`);
          }
        }
        
        // Convertir género a categoría de clase (OBLIGATORIO)
        const classCategory = userGender === 'masculino' ? 'masculino' : 
                            userGender === 'femenino' ? 'femenino' : 
                            'mixto';
        
        console.log(`   🏷️ ASIGNANDO categoría: ${classCategory.toUpperCase()}`);
        console.log(`   🏷️ ASIGNANDO nivel: ${userLevelDisplay}`);
        console.log(`   🏷️ ASIGNANDO rango: ${levelRange || 'SIN RANGO'}`);
        
        // ✅ ACTUALIZAR EL TIMESLOT CON LA CATEGORÍA, NIVEL Y RANGO DEL PRIMER USUARIO
        // Esta es la regla crítica: el primer inscrito define la categoría y rango
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET genderCategory = ${classCategory}, 
              level = ${userLevelDisplay},
              levelRange = ${levelRange},
              updatedAt = datetime('now')
          WHERE id = ${timeSlotId}
        `;
        
        console.log(`   ✅ TimeSlot actualizado: level=${userLevelDisplay}, genderCategory=${classCategory}, levelRange=${levelRange}`);
        
        // Verificar que se haya actualizado correctamente
        const verifyUpdate = await prisma.$queryRaw`
          SELECT genderCategory, level, levelRange FROM TimeSlot WHERE id = ${timeSlotId}
        ` as Array<{genderCategory: string | null, level: string | null, levelRange: string | null}>;
        
        console.log(`   🔍 Verificación: genderCategory=${verifyUpdate[0]?.genderCategory}, level=${verifyUpdate[0]?.level}, levelRange=${verifyUpdate[0]?.levelRange}`);
        
        if (verifyUpdate[0]?.genderCategory !== classCategory) {
          console.log(`   ⚠️ WARNING: La categoría no se actualizó correctamente`);
        }

        // 🆕 CREAR TARJETA DUPLICADA ABIERTO/MIXTO INMEDIATAMENTE
        console.log('🆕 Creating duplicate ABIERTO/mixto slot to allow race...');
        
        try {
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
            
            // Verificar que no exista ya una tarjeta ABIERTA
            const existingOpen = await prisma.$queryRaw`
              SELECT id FROM TimeSlot
              WHERE instructorId = ${slot.instructorId}
              AND start = ${slot.start}
              AND level = 'ABIERTO'
              AND courtId IS NULL
              AND (genderCategory = 'mixto' OR genderCategory IS NULL)
            ` as Array<{id: string}>;
            
            if (existingOpen.length === 0) {
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
                  level: 'ABIERTO',
                  genderCategory: 'mixto',
                  category: slot.category,
                  courtId: null,
                  courtNumber: null
                }
              });

              console.log(`   ✅ Duplicate created: ${newSlot.id}`);
              console.log(`   🏁 Race started: [${userLevel}/${classCategory}] vs [ABIERTO/mixto]`);
            } else {
              console.log(`   ℹ️ Duplicate already exists`);
            }
          }
        } catch (createError) {
          console.error('   ⚠️ Error creating duplicate:', createError);
        }
      }

      // 🏁 SISTEMA DE CARRERAS: Verificar si alguna modalidad se completa
      console.log('🏁 RACE SYSTEM: Checking if any group option is complete...');
      
      // ⚠️ SI ES LA PRIMERA RESERVA Y GRUPO > 1, NO COMPLETAR LA CARRERA
      // Para grupos de 1 jugador, completar inmediatamente
      // Para grupos de 2-4 jugadores, esperar más inscripciones
      if (isFirstBooking && groupSize > 1) {
        console.log('   ℹ️ First booking detected (group size > 1) - race will NOT complete yet');
        console.log('   ⏳ Waiting for more players to join...');
        
        return NextResponse.json({
          success: true,
          bookingId,
          message: 'Reserva creada exitosamente',
          classComplete: false,
          status: 'PENDING'
        });
      }
      
      // 🚨 NORMA #1: VERIFICAR SI YA TIENE UNA RESERVA CONFIRMADA HOY
      // Esta verificación DEBE hacerse ANTES de confirmar la nueva reserva
      const slotDateForCheck = new Date(slotDetails[0].start);
      const startOfDayCheck = new Date(Date.UTC(slotDateForCheck.getUTCFullYear(), slotDateForCheck.getUTCMonth(), slotDateForCheck.getUTCDate(), 0, 0, 0, 0)).toISOString();
      const endOfDayCheck = new Date(Date.UTC(slotDateForCheck.getUTCFullYear(), slotDateForCheck.getUTCMonth(), slotDateForCheck.getUTCDate(), 23, 59, 59, 999)).toISOString();
      
      const existingConfirmedBookingsToday = await prisma.$queryRaw`
        SELECT b.id, ts.start, ts.id as timeSlotId
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${userId}
        AND b.status = 'CONFIRMED'
        AND ts.start >= ${startOfDayCheck}
        AND ts.start <= ${endOfDayCheck}
        AND ts.id != ${timeSlotId}
      ` as Array<{ id: string, start: string, timeSlotId: string }>;
      
      if (existingConfirmedBookingsToday.length > 0) {
        const confirmedTime = new Date(existingConfirmedBookingsToday[0].start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ❌ NORMA #1 VIOLADA: Usuario ya tiene reserva confirmada a las ${confirmedTime}`);
        
        // Cancelar la reserva recién creada
        await prisma.$executeRaw`
          UPDATE Booking 
          SET status = 'CANCELLED', updatedAt = datetime('now')
          WHERE id = ${bookingId}
        `;
        
        // Desbloquear créditos
        await updateUserBlockedCredits(userId);
        
        return NextResponse.json({ 
          error: `Ya tienes una reserva confirmada este día a las ${confirmedTime}. Solo puedes tener una reserva confirmada por día.` 
        }, { status: 400 });
      }
      
      // Si es grupo de 1 jugador, completar la carrera inmediatamente
      if (isFirstBooking && groupSize === 1) {
        console.log('   ✅ First booking with groupSize=1 - completing race immediately');
      }
      
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
      
      // 🎫 RESERVA PRIVADA: Gana automáticamente la carrera
      if (isPrivate) {
        console.log(`   🎫 PRIVATE RESERVATION WINS! Auto-completing race for ${groupSize} players`);
        raceWinner = groupSize;
      } else {
        // Lógica normal de carrera para reservas normales
        for (const [groupSize, count] of bookingsByGroupSize.entries()) {
          console.log(`   🔍 Option ${groupSize} players: ${count}/${groupSize} bookings`);
          
          if (count >= groupSize) {
            console.log(`   ✅ WINNER! Option for ${groupSize} player(s) is COMPLETE!`);
            raceWinner = groupSize;
            break;
          }
        }
      }
      
      // Si hay un ganador, procesar confirmación y cobro
      if (raceWinner !== null) {
          
          console.log(`   💰 PROCESSING WINNER - Confirming and charging winning bookings...`);
          
          // ✅ PASO 1: CONFIRMAR Y COBRAR RESERVAS GANADORAS (SIEMPRE, independiente de si hay pista)
          const winningBookings = allBookingsForSlot.filter(b => b.groupSize === raceWinner);
          console.log(`   ✅ Winning bookings (${raceWinner} players):`, winningBookings.length);
          
          // Obtener detalles del slot para transacciones
          const slotDetailsForCharging = await prisma.$queryRaw`
            SELECT start, end, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
          ` as Array<{start: Date, end: Date, instructorId: string}>;
          
          for (const booking of winningBookings) {
            // 🔒 VERIFICACIÓN FINAL ANTES DE CONFIRMAR (para prevenir race conditions)
            const slotForCheck = await prisma.$queryRaw`
              SELECT start FROM TimeSlot WHERE id = ${timeSlotId}
            ` as Array<{start: string}>;
            
            if (slotForCheck.length > 0) {
              const slotDateForFinalCheck = new Date(slotForCheck[0].start);
              const startOfDayFinalCheck = new Date(Date.UTC(slotDateForFinalCheck.getUTCFullYear(), slotDateForFinalCheck.getUTCMonth(), slotDateForFinalCheck.getUTCDate(), 0, 0, 0, 0)).toISOString();
              const endOfDayFinalCheck = new Date(Date.UTC(slotDateForFinalCheck.getUTCFullYear(), slotDateForFinalCheck.getUTCMonth(), slotDateForFinalCheck.getUTCDate(), 23, 59, 59, 999)).toISOString();
              
              const confirmedBookingsSameDayFinalCheck = await prisma.$queryRaw`
                SELECT b.id FROM Booking b
                JOIN TimeSlot ts ON b.timeSlotId = ts.id
                WHERE b.userId = ${booking.userId}
                AND b.status = 'CONFIRMED'
                AND ts.start >= ${startOfDayFinalCheck}
                AND ts.start <= ${endOfDayFinalCheck}
                AND ts.id != ${timeSlotId}
              ` as Array<{id: string}>;
              
              if (confirmedBookingsSameDayFinalCheck.length > 0) {
                console.log(`      ⚠️ BLOCKED: User ${booking.userId} already has a confirmed booking today - cancelling this booking`);
                
                await prisma.$executeRaw`
                  UPDATE Booking 
                  SET status = 'CANCELLED', updatedAt = datetime('now')
                  WHERE id = ${booking.id}
                `;
                
                await updateUserBlockedCredits(booking.userId);
                continue;
              }
            }
            
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
            
            // 💳 COBRAR del saldo real
            await prisma.$executeRaw`
              UPDATE User 
              SET credits = credits - ${amountToCharge}, updatedAt = datetime('now')
              WHERE id = ${booking.userId}
            `;
            
            // ✅ Actualizar booking a CONFIRMED
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
                concept: `Clase confirmada - ${slotDetailsForCharging.length > 0 ? new Date(slotDetailsForCharging[0].start).toLocaleString('es-ES') : 'N/A'}`,
                relatedId: booking.id,
                relatedType: 'booking',
                metadata: {
                  timeSlotId,
                  groupSize: booking.groupSize,
                  status: 'CONFIRMED'
                }
              });
            }
            
            console.log(`      ✅ Confirmed and charged €${(amountToCharge/100).toFixed(2)} to user ${booking.userId}`);
            
            // 🚫 CANCELAR OTRAS INSCRIPCIONES DEL MISMO DÍA
            console.log(`      🔍 Verificando otras inscripciones del usuario ${booking.userId} para cancelar...`);
            await cancelOtherBookingsOnSameDay(booking.userId, timeSlotId, prisma);
          }
          
          // ❌ PASO 2: CANCELAR RESERVAS PERDEDORAS
          const losingBookings = allBookingsForSlot.filter(b => b.groupSize !== raceWinner);
          console.log(`   ❌ Losing bookings to cancel:`, losingBookings.length);
          
          for (const booking of losingBookings) {
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
              // 🎁 Otorgar puntos de compensación
              const newPoints = await grantCompensationPoints(booking.userId, amountBlocked);
              const pointsGranted = Math.floor(amountBlocked / 100);
              
              console.log(`      🎁 Booking confirmado cancelado - Otorgados ${pointsGranted} puntos de compensación al usuario ${booking.userId}`);
              
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
            
            console.log(`      ❌ Cancelled booking ${booking.id} (${booking.groupSize} players)`);
          }
          
          console.log(`   ✅ Winning bookings charged, losing bookings cancelled`);
          
          console.log(`   ✅ Race system completed! Winner: ${raceWinner} player(s)`);
          
          // 🎾 PASO 3: INTENTAR ASIGNAR PISTA (si está disponible)
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
            
            const { clubId } = timeSlotTiming[0];
            const slotStart = new Date(timeSlotTiming[0].start);
            
            // 🔒 SIEMPRE ASUMIR 60 MINUTOS DE DURACIÓN para la verificación de pistas
            // Esto previene solapamientos cuando las clases se extienden de 30 a 60 min
            const slotEnd = new Date(slotStart.getTime() + (60 * 60 * 1000)); // +60 min
            const start = slotStart.toISOString();
            const end = slotEnd.toISOString();
            
            console.log(`   📏 Verificando disponibilidad para rango COMPLETO: ${start} - ${end} (60 min)`);
            
            // 1. Buscar pistas ocupadas por OTRAS CLASES que se solapen con este horario (60 min)
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
            
            console.log(`   🔍 Occupied courts for ${start} - ${end}:`, occupiedCourtNumbers);
            
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
              
              // 🕒 EXTENDER SLOT A 60 MINUTOS (si es de 30 min, extenderlo)
              const slotDetails = await prisma.$queryRaw`
                SELECT start, end, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
              ` as Array<{start: Date, end: Date, instructorId: string}>;
              
              if (slotDetails.length > 0) {
                const currentStart = new Date(slotDetails[0].start);
                const currentEnd = new Date(slotDetails[0].end);
                const durationMinutes = (currentEnd.getTime() - currentStart.getTime()) / (1000 * 60);
                
                console.log(`   📏 Duración actual del slot: ${durationMinutes} minutos`);
                
                // Si el slot es de 30 minutos, extenderlo a 60 minutos
                if (durationMinutes === 30) {
                  const newEnd = new Date(currentStart.getTime() + (60 * 60 * 1000)); // +60 minutos
                  console.log(`   🔄 Extendiendo slot de 30min a 60min: ${currentEnd.toISOString()} → ${newEnd.toISOString()}`);
                  
                  await prisma.$executeRaw`
                    UPDATE TimeSlot 
                    SET end = ${newEnd.toISOString()}, courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
                    WHERE id = ${timeSlotId}
                  `;
                } else {
                  // Si ya es de 60 minutos, solo asignar pista
                  await prisma.$executeRaw`
                    UPDATE TimeSlot 
                    SET courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
                    WHERE id = ${timeSlotId}
                  `;
                }
              }
              
              console.log(`   ✅ Court ${courtAssigned} (ID: ${assignedCourtId}) assigned to TimeSlot ${timeSlotId}`);

              // 🗑️ ELIMINAR PROPUESTAS SOLAPADAS DEL MISMO INSTRUCTOR (SIGUIENTES 60 MIN)
              console.log(`   🗑️ Removing overlapping proposals from same instructor...`);
              
              const slotDetailsForDeletion = await prisma.$queryRaw`
                SELECT start, end, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
              ` as Array<{start: Date, end: Date, instructorId: string}>;
              
              if (slotDetailsForDeletion.length > 0) {
                const confirmedStart = new Date(slotDetailsForDeletion[0].start);
                const confirmedEnd = new Date(slotDetailsForDeletion[0].end);
                const instructorId = slotDetailsForDeletion[0].instructorId;
                
                console.log(`      🔍 Buscando propuestas entre ${confirmedStart.toISOString()} y ${confirmedEnd.toISOString()}`);
                
                // Eliminar TODAS las propuestas del mismo instructor que solapen con esta clase de 60 min
                // Esto incluye las 2 propuestas de 30 min que conforman la hora completa
                const deletedProposals = await prisma.$executeRaw`
                  DELETE FROM TimeSlot
                  WHERE instructorId = ${instructorId}
                  AND courtId IS NULL
                  AND id != ${timeSlotId}
                  AND (
                    (start >= ${confirmedStart.toISOString()} AND start < ${confirmedEnd.toISOString()})
                    OR (end > ${confirmedStart.toISOString()} AND end <= ${confirmedEnd.toISOString()})
                    OR (start <= ${confirmedStart.toISOString()} AND end >= ${confirmedEnd.toISOString()})
                  )
                `;
                
                console.log(`      ✅ Deleted ${deletedProposals} overlapping proposals (from ${confirmedStart.toLocaleTimeString()} to ${confirmedEnd.toLocaleTimeString()})`);
              }

              // 📅 MARCAR CALENDARIOS COMO OCUPADOS si se asignó pista
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
              
              // Actualizar metadata de transacciones con courtNumber
              console.log(`      📝 Updating transactions with court number ${courtAssigned}...`);
            }
          }
          
          console.log(`   🏟️ Court assignment: ${courtAssigned ? `Court ${courtAssigned} assigned` : 'No court available (class will execute anyway)'}`);
      }

      // 🎯 AUTO-GENERAR NUEVA TARJETA ABIERTA
      await autoGenerateOpenSlot(timeSlotId, prisma);

      console.log('');
      console.log('✅✅✅ RESERVA CREADA EXITOSAMENTE ✅✅✅');
      console.log('📋 Booking ID:', bookingId);
      console.log('👤 Usuario:', userId);
      console.log('📅 TimeSlot:', timeSlotId);
      console.log('🎮 Group Size:', groupSize);
      console.log('💰 Monto bloqueado:', pricePerSlot, '€');
      console.log('='.repeat(80));
      console.log('');

      // 🔄 Obtener el TimeSlot actualizado con todos los bookings (incluye profilePictureUrl y userLevel)
      const updatedSlot = await prisma.$queryRaw`
        SELECT 
          ts.*,
          i.name as instructorName,
          i.profilePictureUrl as instructorProfilePicture
        FROM TimeSlot ts
        LEFT JOIN Instructor i ON ts.instructorId = i.id
        WHERE ts.id = ${timeSlotId}
      ` as Array<any>;
      
      const updatedBookings = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.userId,
          b.groupSize,
          b.status,
          b.createdAt,
          u.name,
          u.email,
          u.level as userLevel,
          u.position as userGender,
          u.profilePictureUrl
        FROM Booking b
        JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${timeSlotId}
        AND b.status IN ('CONFIRMED', 'PENDING')
        ORDER BY b.createdAt ASC
      ` as Array<any>;
      
      const updatedSlotData = updatedSlot[0] ? {
        ...updatedSlot[0],
        bookings: updatedBookings.map(b => ({
          id: b.id,
          userId: b.userId,
          groupSize: Number(b.groupSize),
          status: b.status,
          name: b.name,
          userName: b.name,
          userEmail: b.email,
          userLevel: b.userLevel,
          userGender: b.userGender,
          profilePictureUrl: b.profilePictureUrl,
          createdAt: b.createdAt
        }))
      } : null;

      return NextResponse.json({
        success: true,
        bookingId,
        message: 'Reserva creada exitosamente',
        classComplete: raceWinner !== null,
        winningOption: raceWinner,
        courtAssigned: courtAssigned,
        updatedSlot: updatedSlotData // ✅ Devolver slot actualizado con bookings completos
      });



  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
