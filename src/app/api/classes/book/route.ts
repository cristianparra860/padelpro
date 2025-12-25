// API corregida para la estructura real de la BD
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  calculateSlotPrice, 
  hasAvailableCredits, 
  updateUserBlockedCredits,
  grantCompensationPoints,
  resetSlotCategoryIfEmpty
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
    console.log(`\n🚨🚨🚨 EJECUTANDO cancelOtherBookingsOnSameDay 🚨🚨🚨`);
    console.log(`🔍 Usuario: ${userId}`);
    console.log(`🔍 TimeSlot confirmado: ${confirmedTimeSlotId}`);
    
    // Obtener la fecha del slot confirmado
    const confirmedSlot = await prisma.$queryRaw`
      SELECT start FROM TimeSlot WHERE id = ${confirmedTimeSlotId}
    ` as Array<{ start: string }>;
    
    if (!confirmedSlot || confirmedSlot.length === 0) {
      console.log('❌ No se pudo obtener información del slot confirmado');
      return;
    }
    
    console.log(`📅 Slot confirmado start value: "${confirmedSlot[0].start}" (tipo: ${typeof confirmedSlot[0].start})`);
    
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
    
    console.log(`\n🔎 BUSCANDO OTRAS INSCRIPCIONES DEL USUARIO...`);
    console.log(`   Parámetros de búsqueda:`);
    console.log(`   - userId: ${userId}`);
    console.log(`   - status: PENDING o CONFIRMED`);
    console.log(`   - timeSlotId diferente de: ${confirmedTimeSlotId}`);
    console.log(`   - ts.start >= ${startOfDay}`);
    console.log(`   - ts.start <= ${endOfDay}\n`);
    
    // 🔧 FIX: Convertir fechas ISO a timestamps para comparación en SQLite
    const startTimestamp = startOfDayDate.getTime();
    const endTimestamp = endOfDayDate.getTime();
    
    console.log(`   📅 Rango de timestamps: ${startTimestamp} - ${endTimestamp}\n`);
    
    const otherBookings = await prisma.$queryRaw`
      SELECT b.id, b.userId, b.timeSlotId, b.amountBlocked, b.status, ts.start, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status IN ('PENDING', 'CONFIRMED')
      AND b.timeSlotId != ${confirmedTimeSlotId}
      AND ts.start >= ${startTimestamp}
      AND ts.start <= ${endTimestamp}
    ` as Array<{ id: string, userId: string, timeSlotId: string, amountBlocked: number | bigint, status: string, start: string | number, courtNumber: number | null }>;
    
    console.log(`📊 Otras inscripciones/reservas encontradas en el mismo día: ${otherBookings.length}`);
    if (otherBookings.length > 0) {
      console.log(`   Detalles de las inscripciones encontradas:`);
      otherBookings.forEach((b, i) => {
        const time = new Date(b.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const hasCourt = b.courtNumber ? `Pista ${b.courtNumber}` : 'SIN PISTA';
        console.log(`   ${i+1}. ${b.status} - ${time} - ${hasCourt} (Booking: ${b.id})`);
      });
    }
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
      
      // Obtener información del pago
      const bookingInfo = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: { paidWithPoints: true, pointsUsed: true }
      });
      
      const isPaidWithPoints = bookingInfo?.paidWithPoints || false;
      const pointsBlocked = bookingInfo?.pointsUsed || 0;
      
      if (isPending && hasNoCourt) {
        console.log(`   🗑️ ELIMINANDO inscripción PENDIENTE sin pista ${booking.id} (${bookingTime}) - Liberar ${isPaidWithPoints ? `${pointsBlocked} puntos` : `€${(amountBlocked/100).toFixed(2)}`}`);
      } else if (booking.status === 'CONFIRMED') {
        console.log(`   ❌ CANCELANDO reserva CONFIRMADA ${booking.id} (${bookingTime}) - Compensación ${isPaidWithPoints ? `${pointsBlocked} puntos` : `€${(amountBlocked/100).toFixed(2)}`}`);
      } else {
        console.log(`   ❌ CANCELANDO inscripción ${booking.id} (${bookingTime})`);
      }
      
      // Cambiar estado a CANCELLED
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CANCELLED', updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      
      // Si la reserva estaba CONFIRMED, otorgar compensación
      if (booking.status === 'CONFIRMED') {
        if (isPaidWithPoints) {
          // Devolver puntos
          console.log(`      💎 Reserva confirmada cancelada - Devolviendo ${pointsBlocked} puntos`);
          
          await prisma.$executeRaw`
            UPDATE User
            SET points = points + ${pointsBlocked}, updatedAt = datetime('now')
            WHERE id = ${userId}
          `;
          
          const userAfterRefund = await prisma.user.findUnique({
            where: { id: userId },
            select: { points: true }
          });
          
          if (userAfterRefund) {
            await createTransaction({
              userId,
              type: 'points',
              action: 'add',
              amount: pointsBlocked,
              balance: userAfterRefund.points,
              concept: `Devolución: Reserva cancelada automáticamente - Solo 1 reserva confirmada por día`,
              relatedId: booking.id,
              relatedType: 'booking',
              metadata: {
                timeSlotId: booking.timeSlotId,
                reason: 'one_booking_per_day_rule',
                pointsRefunded: pointsBlocked
              }
            });
          }
        } else {
          // Otorgar puntos de compensación (pago con créditos)
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
        }
      } else {
        // Para inscripciones PENDING, desbloquear puntos o créditos
        if (isPaidWithPoints) {
          // Desbloquear puntos
          console.log(`      💎 Desbloqueando ${pointsBlocked} puntos`);
          
          await prisma.$executeRaw`
            UPDATE User
            SET blockedPoints = blockedPoints - ${pointsBlocked}, updatedAt = datetime('now')
            WHERE id = ${userId}
          `;
          
          const userAfterUnblock = await prisma.user.findUnique({
            where: { id: userId },
            select: { points: true, blockedPoints: true }
          });
          
          if (userAfterUnblock) {
            await createTransaction({
              userId,
              type: 'points',
              action: 'unblock',
              amount: pointsBlocked,
              balance: userAfterUnblock.points - userAfterUnblock.blockedPoints,
              concept: `Puntos desbloqueados - Ya tienes una reserva confirmada a las ${new Date(confirmedSlot[0].start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
              relatedId: booking.id,
              relatedType: 'booking',
              metadata: {
                timeSlotId: booking.timeSlotId,
                reason: 'one_booking_per_day_rule',
                isPending: true,
                confirmedTimeSlotId,
                pointsUnblocked: pointsBlocked
              }
            });
          }
        } else {
          // Desbloquear créditos y registrar transacción
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
      }
      
      // Desbloquear créditos si no pagó con puntos
      if (!isPaidWithPoints) {
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
    }
    
    console.log(`✅ ${otherBookings.length} inscripción(es) cancelada(s) automáticamente`);
    
    // 🔄 VERIFICAR SI ALGUNA TARJETA SE QUEDÓ SIN USUARIOS
    // Obtener todas las tarjetas únicas de los bookings cancelados
    const uniqueTimeSlotIds = [...new Set(otherBookings.map(b => b.timeSlotId))];
    for (const slotId of uniqueTimeSlotIds) {
      await resetSlotCategoryIfEmpty(slotId);
    }
    
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
          'ABIERTO', 
          'ABIERTO', 
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

// 🎾 FUNCIÓN REUTILIZABLE PARA ASIGNAR PISTA
async function assignCourtToClass(timeSlotId: string, raceWinner: number): Promise<{courtAssigned: number | null, success: boolean}> {
  try {
    console.log(`\n🎾 === ASIGNACIÓN DE PISTA ===`);
    console.log(`   📍 TimeSlot: ${timeSlotId}`);
    console.log(`   🏆 Winner: ${raceWinner} player(s)`);

    // Verificar si el timeSlot ya tiene pista asignada
    const currentTimeSlot = await prisma.$queryRaw`
      SELECT courtNumber FROM TimeSlot WHERE id = ${timeSlotId}
    ` as Array<{courtNumber: number | null}>;
    
    if (currentTimeSlot[0]?.courtNumber) {
      console.log(`   ℹ️ Court already assigned: ${currentTimeSlot[0].courtNumber}`);
      return { courtAssigned: currentTimeSlot[0].courtNumber, success: true };
    }

    // Obtener el horario de esta clase
    const timeSlotTiming = await prisma.$queryRaw`
      SELECT start, end, clubId FROM TimeSlot WHERE id = ${timeSlotId}
    ` as Array<{start: string, end: string, clubId: string}>;
    
    const { clubId } = timeSlotTiming[0];
    const slotStart = new Date(timeSlotTiming[0].start);
    
    // 🔒 SIEMPRE ASUMIR 60 MINUTOS DE DURACIÓN para la verificación de pistas
    const slotEnd = new Date(slotStart.getTime() + (60 * 60 * 1000)); // +60 min
    const start = slotStart.toISOString();
    const end = slotEnd.toISOString();
    
    console.log(`   📏 Verificando disponibilidad para rango COMPLETO: ${start} - ${end} (60 min)`);
    
    // 1. Buscar pistas ocupadas por OTRAS CLASES
    const occupiedByClasses = await prisma.$queryRaw`
      SELECT courtNumber FROM TimeSlot 
      WHERE clubId = ${clubId}
      AND courtNumber IS NOT NULL
      AND id != ${timeSlotId}
      AND start < ${end}
      AND end > ${start}
      GROUP BY courtNumber
    ` as Array<{courtNumber: number}>;
    
    // 2. Buscar pistas bloqueadas en CourtSchedule
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
    
    // Encontrar la primera pista disponible
    let courtAssigned: number | null = null;
    for (const court of clubCourts) {
      if (!occupiedCourtNumbers.includes(court.number)) {
        courtAssigned = court.number;
        console.log(`   ✅ Assigning first available court: ${courtAssigned}`);
        break;
      }
    }
    
    if (!courtAssigned) {
      console.log(`   ⚠️ NO AVAILABLE COURTS! All ${totalCourts} courts are occupied`);
      return { courtAssigned: null, success: false };
    }

    // Obtener el courtId de la pista asignada
    const courtInfo = await prisma.$queryRaw`
      SELECT id FROM Court WHERE number = ${courtAssigned} AND clubId = ${clubId} LIMIT 1
    ` as Array<{id: string}>;
    
    const assignedCourtId = courtInfo && courtInfo.length > 0 ? courtInfo[0].id : null;
    
    // 🕒 EXTENDER SLOT A 60 MINUTOS (si es de 30 min)
    const slotDetails = await prisma.$queryRaw`
      SELECT start, end, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
    ` as Array<{start: Date, end: Date, instructorId: string}>;
    
    if (slotDetails.length > 0) {
      const currentStart = slotDetails[0].start;
      const currentEnd = slotDetails[0].end;
      const durationMinutes = (Number(currentEnd) - Number(currentStart)) / (1000 * 60);
      
      console.log(`   📏 Duración actual del slot: ${durationMinutes} minutos`);
      
      // Si el slot es de 30 minutos, extenderlo a 60 minutos
      if (durationMinutes === 30) {
        const newEndTimestamp = Number(currentStart) + (60 * 60 * 1000); // +60 minutos
        console.log(`   🔄 Extendiendo slot de 30min a 60min`);
        
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET end = ${newEndTimestamp}, courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
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

      // 🔒 MARCAR PISTA OCUPADA EN SCHEDULE
      const instructorId = slotDetails[0].instructorId;
      
      // Crear registro en CourtSchedule
      const courtScheduleId = `cs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await prisma.$executeRaw`
        INSERT INTO CourtSchedule (id, courtId, startTime, endTime, isOccupied, createdAt, updatedAt)
        VALUES (${courtScheduleId}, ${assignedCourtId}, ${start}, ${end}, 1, datetime('now'), datetime('now'))
      `;
      
      // Crear registro en InstructorSchedule
      const instructorScheduleId = `is-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await prisma.$executeRaw`
        INSERT INTO InstructorSchedule (id, instructorId, startTime, endTime, isOccupied, createdAt, updatedAt)
        VALUES (${instructorScheduleId}, ${instructorId}, ${start}, ${end}, 1, datetime('now'), datetime('now'))
      `;
      
      console.log(`   ✅ Court ${courtAssigned} assigned and marked occupied`);
    }

    return { courtAssigned, success: true };
    
  } catch (error) {
    console.error(`   ❌ Error assigning court:`, error);
    return { courtAssigned: null, success: false };
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
      
      // Calcular inicio y fin del día en timestamps
      const startOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0));
      const endOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 23, 59, 59, 999));
      const startTimestamp = startOfDayDate.getTime();
      const endTimestamp = endOfDayDate.getTime();
      
      console.log(`🔍 Verificando reservas confirmadas del día ${slotDate.toISOString().split('T')[0]}`);
      console.log(`   Rango timestamps: ${startTimestamp} - ${endTimestamp}`);
      
      // ♻️ MODIFICADO: Excluir bookings CANCELLED - los usuarios que cancelaron pueden reservar de nuevo ese día
      const confirmedBookingsToday = await prisma.$queryRaw`
        SELECT b.id, ts.start, ts.courtNumber, b.status
        FROM Booking b
        JOIN TimeSlot ts ON b.timeSlotId = ts.id
        WHERE b.userId = ${userId}
        AND b.status = 'CONFIRMED'
        AND ts.start >= ${startTimestamp}
        AND ts.start <= ${endTimestamp}
      ` as Array<{ id: string, start: string | number, courtNumber: number, status: string }>;
      
      console.log(`   📊 Reservas confirmadas (con pista asignada) encontradas: ${confirmedBookingsToday.length}`);
      
      if (confirmedBookingsToday.length > 0) {
        const confirmedDate = new Date(Number(confirmedBookingsToday[0].start));
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
      // 🎁 EXCEPCIÓN: Si es pago con puntos (plazas individuales), permitir múltiples reservas
      const existingBookingForGroupSize = await prisma.$queryRaw`
        SELECT id FROM Booking 
        WHERE userId = ${userId} 
        AND timeSlotId = ${timeSlotId} 
        AND groupSize = ${Number(groupSize) || 1}
        AND status IN ('PENDING', 'CONFIRMED')
      `;

      // 🎁 Solo bloquear si NO es pago con puntos (plazas individuales)
      if (!usePoints && existingBookingForGroupSize && (existingBookingForGroupSize as any[]).length > 0) {
        return NextResponse.json({ error: `Ya tienes una reserva para la modalidad de ${groupSize} jugador${groupSize > 1 ? 'es' : ''} en esta clase` }, { status: 400 });
      }

      // Verificar si la modalidad específica ya está completa
      // ♻️ EXCLUIR PLAZAS CANCELADAS (recicladas) del conteo
      const modalityBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM Booking 
        WHERE timeSlotId = ${timeSlotId} 
        AND groupSize = ${Number(groupSize) || 1}
        AND status IN ('PENDING', 'CONFIRMED')
      `;
      
      // ♻️ Contar plazas recicladas (CANCELLED con isRecycled=true) en esta modalidad
      const recycledModalityBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM Booking 
        WHERE timeSlotId = ${timeSlotId} 
        AND groupSize = ${Number(groupSize) || 1}
        AND status = 'CANCELLED'
        AND isRecycled = 1
      `;

      const currentModalityBookings = Number((modalityBookings as any[])[0].count);
      const recycledSlots = Number((recycledModalityBookings as any[])[0].count);
      const requiredBookingsForModality = Number(groupSize) || 1;
      
      // ♻️ RESTAR plazas recicladas del total requerido (libera espacios)
      const availableSlots = requiredBookingsForModality - (currentModalityBookings - recycledSlots);

      console.log(`📊 Modalidad ${groupSize}: ${currentModalityBookings} activas, ${recycledSlots} recicladas = ${currentModalityBookings - recycledSlots} ocupadas / ${requiredBookingsForModality} total`);
      console.log(`♻️ Espacios disponibles: ${availableSlots}`);

      // ♻️ Solo bloquear si NO hay espacios disponibles (considerando recicladas)
      if (availableSlots <= 0 && recycledSlots === 0) {
        return NextResponse.json({ 
          error: `La modalidad de ${groupSize} jugador${groupSize > 1 ? 'es' : ''} ya está completa (${currentModalityBookings - recycledSlots}/${requiredBookingsForModality})` 
        }, { status: 400 });
      }

      // 💰 OBTENER PRECIO DEL TIMESLOT Y VERIFICAR SALDO DISPONIBLE
      const priceInfo = await prisma.$queryRaw`
        SELECT totalPrice, creditsSlots, creditsCost FROM TimeSlot WHERE id = ${timeSlotId}
      `;

      if (!priceInfo || (priceInfo as any[]).length === 0) {
        return NextResponse.json({ error: 'No se pudo obtener información del precio' }, { status: 500 });
      }

      const totalPrice = Number((priceInfo as any[])[0].totalPrice) || 55;
      const creditsSlots = (priceInfo as any[])[0].creditsSlots;
      // ♻️ IMPORTANTE: creditsCost del TimeSlot es para plazas normales con puntos
      // Para plazas recicladas, calcular precio por persona
      const creditsCostFromDB = Number((priceInfo as any[])[0].creditsCost) || 50;
      
      // 🎁 Verificar si este groupSize es una plaza con puntos
      // IMPORTANTE: creditsSlots ahora contiene índices absolutos (0-9), no groupSize (1-4)
      // Necesitamos calcular qué índice ocupará esta nueva reserva
      let isCreditsSlot = false;
      let isRecycledSlot = false;
      
      // Calcular el rango de índices para esta modalidad
      const groupSizeNum = Number(groupSize) || 1;
      const startIndex = [1,2,3,4].slice(0, groupSizeNum - 1).reduce((sum, p) => sum + p, 0);
      const endIndex = startIndex + groupSizeNum;
      
      // ♻️ NUEVA LÓGICA: Verificar si hay plazas recicladas en esta modalidad
      const recycledBookingsForModality = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM Booking
        WHERE timeSlotId = ${timeSlotId}
        AND groupSize = ${groupSizeNum}
        AND status = 'CANCELLED'
        AND isRecycled = 1
      ` as Array<{count: number}>;
      
      const hasRecycledSlots = Number(recycledBookingsForModality[0]?.count) > 0;
      
      if (hasRecycledSlots) {
        // ♻️ Si hay plazas recicladas, esta modalidad SOLO se puede reservar con puntos
        isCreditsSlot = true;
        isRecycledSlot = true;
        console.log(`♻️ Modalidad ${groupSizeNum} tiene plazas recicladas - SOLO PUNTOS`);
      } else if (creditsSlots) {
        try {
          const parsedCreditsSlots = JSON.parse(creditsSlots);
          
          // Contar cuántas plazas ya están ocupadas en esta modalidad (excluir recicladas)
          const existingBookingsForModality = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM Booking
            WHERE timeSlotId = ${timeSlotId}
            AND groupSize = ${groupSizeNum}
            AND status IN ('PENDING', 'CONFIRMED')
          ` as Array<{count: number}>;
          
          const occupiedCount = Number(existingBookingsForModality[0]?.count) || 0;
          const nextSlotIndex = startIndex + occupiedCount;
          
          console.log(`🎯 Modalidad ${groupSizeNum}: rango ${startIndex}-${endIndex-1}, plazas ocupadas: ${occupiedCount}, próximo índice: ${nextSlotIndex}`);
          console.log(`🎁 creditsSlots array: [${parsedCreditsSlots.join(', ')}]`);
          
          // Verificar si el próximo slot disponible es una creditsSlot
          isCreditsSlot = nextSlotIndex < endIndex && 
                         Array.isArray(parsedCreditsSlots) && 
                         parsedCreditsSlots.includes(nextSlotIndex);
                         
          console.log(`🎁 ¿Próximo slot (${nextSlotIndex}) es creditsSlot? ${isCreditsSlot}`);
        } catch (e) {
          console.warn('⚠️ Error parseando creditsSlots:', e);
        }
      }
      
      // ♻️ Calcular coste correcto según tipo de plaza
      const creditsCost = isRecycledSlot 
        ? Math.ceil(totalPrice / groupSizeNum) // Plazas recicladas: precio por persona
        : creditsCostFromDB; // Plazas normales con puntos: coste fijo del TimeSlot
      
      console.log(`🎁 Es plaza con puntos: ${isCreditsSlot}, Es reciclada: ${isRecycledSlot}, Coste: ${creditsCost} puntos`);
      
      // 🚫 VALIDACIÓN: Si es credits slot o plaza reciclada, DEBE pagar con puntos
      if (isCreditsSlot && !usePoints) {
        console.log('❌ Intento de reservar credits slot/plaza reciclada sin usar puntos');
        return NextResponse.json({ 
          error: `Esta plaza solo se puede reservar con puntos`,
          details: isRecycledSlot 
            ? `Esta plaza fue reciclada y solo se puede reservar con ${creditsCost} puntos.`
            : `Esta plaza requiere ${creditsCost} puntos. No se puede pagar con créditos.`,
          required: creditsCost,
          isCreditsSlot: true,
          isRecycled: isRecycledSlot
        }, { status: 400 });
      }
      
      // 🎫 RESERVA PRIVADA: Usuario paga el precio total completo
      // 🎯 RESERVA NORMAL: Usuario paga precio dividido por número de jugadores
      const pricePerSlot = isPrivate 
        ? totalPrice  // Reserva privada = precio total
        : calculateSlotPrice(totalPrice, Number(groupSize) || 1); // Reserva normal = precio dividido

      console.log(`💰 Precio total: €${totalPrice}, ${isPrivate ? 'RESERVA PRIVADA' : `Precio por grupo (${groupSize} jugadores)`}: €${pricePerSlot.toFixed(2)}`);

      // 💰 VERIFICAR MÉTODO DE PAGO: SIEMPRE USA CRÉDITOS (sistema de puntos eliminado)
      if (usePoints) {
        // 🎯 PAGO CON CRÉDITOS (sistema antiguo de puntos eliminado, ahora todo es con créditos)
        console.log('💰 Verificando saldo de CRÉDITOS (credits slot)...');
        
        const userInfo = await prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true, blockedCredits: true }
        });
        
        // 🎁 Si es credits slot, usar creditsCost en lugar de puntos (convertido a euros/100)
        // creditsCost venía en "puntos" pero ahora representa céntimos de euro
        const creditsRequired = isCreditsSlot ? creditsCost : Math.floor(pricePerSlot);
        const creditsAvailable = (userInfo?.credits || 0) - (userInfo?.blockedCredits || 0);
        
        console.log(`💳 Créditos requeridos: ${creditsRequired} céntimos (€${(creditsRequired/100).toFixed(2)}) ${isCreditsSlot ? '(credits slot)' : ''}, Créditos disponibles: ${creditsAvailable} céntimos (€${(creditsAvailable/100).toFixed(2)})`);
        
        if (creditsAvailable < creditsRequired) {
          console.log(`❌ Créditos insuficientes: necesita ${creditsRequired} céntimos, disponible ${creditsAvailable} céntimos`);
          return NextResponse.json({ 
            error: `Saldo insuficiente`,
            details: `Necesitas €${(creditsRequired/100).toFixed(2)} disponibles pero solo tienes €${(creditsAvailable/100).toFixed(2)}. ${isCreditsSlot ? 'Esta plaza requiere créditos para reservar.' : ''}`,
            required: creditsRequired,
            available: creditsAvailable,
            missing: creditsRequired - creditsAvailable
          }, { status: 400 });
        }
        
        console.log(`✅ Créditos disponibles suficientes: ${creditsRequired} céntimos serán BLOQUEADOS (no cobrados hasta confirmación)`);
        
      } else {
        // 💳 PAGO CON CRÉDITOS (NORMAL)
        console.log('💳 Verificando saldo de CRÉDITOS para pago...');
        
        // Convertir pricePerSlot (euros) a céntimos para la validación
        const priceInCents = Math.round(pricePerSlot * 100);
        const hasCredits = await hasAvailableCredits(userId, priceInCents);
        
        if (!hasCredits) {
          const userInfo = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true, blockedCredits: true }
          });
          
          const available = userInfo!.credits - userInfo!.blockedCredits; // En céntimos
          const required = priceInCents; // En céntimos
          
          console.log(`❌ Saldo insuficiente: necesita €${(required/100).toFixed(2)}, disponible €${(available/100).toFixed(2)}`);
          return NextResponse.json({ 
            error: `Saldo insuficiente`,
            details: `Necesitas €${(required/100).toFixed(2)} disponibles pero solo tienes €${(available/100).toFixed(2)}. Por favor, recarga tu saldo.`,
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

      // 🎁 REEMPLAZO DE BOOKING DEL INSTRUCTOR SUBSIDIO
      // Si estamos reservando con puntos (usePoints=true), verificar si existe un booking del instructor con subsidio
      if (usePoints && groupSize === 1) {
        console.log(`🔍 Verificando si existe booking de subsidio del instructor...`);
        const instructorSubsidy = await prisma.$queryRaw`
          SELECT id, userId, amountBlocked
          FROM Booking
          WHERE timeSlotId = ${timeSlotId}
          AND groupSize = 1
          AND isInstructorSubsidy = 1
          AND status = 'CONFIRMED'
          LIMIT 1
        ` as Array<{ id: string; userId: string; amountBlocked: number }>;

        if (instructorSubsidy.length > 0) {
          const subsidyBooking = instructorSubsidy[0];
          console.log(`🎁 Encontrado booking de subsidio: ${subsidyBooking.id}, instructor: ${subsidyBooking.userId}, monto: ${subsidyBooking.amountBlocked}`);
          
          // Cancelar booking del instructor
          await prisma.$executeRaw`
            UPDATE Booking
            SET status = 'CANCELLED', updatedAt = datetime('now')
            WHERE id = ${subsidyBooking.id}
          `;
          console.log(`✅ Booking de subsidio cancelado`);
          
          // Devolver créditos al instructor
          await prisma.$executeRaw`
            UPDATE User
            SET credits = credits + ${subsidyBooking.amountBlocked}, updatedAt = datetime('now')
            WHERE id = ${subsidyBooking.userId}
          `;
          console.log(`💰 Créditos devueltos al instructor: +${subsidyBooking.amountBlocked} céntimos`);
          
          // Crear transacción de reembolso
          const transactionId = `txn-refund-subsidy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await prisma.$executeRaw`
            INSERT INTO Transaction (id, userId, type, amount, description, status, createdAt, updatedAt)
            VALUES (
              ${transactionId},
              ${subsidyBooking.userId},
              'REFUND',
              ${subsidyBooking.amountBlocked},
              'Reembolso por booking de subsidio reemplazado por usuario',
              'COMPLETED',
              datetime('now'),
              datetime('now')
            )
          `;
          console.log(`📝 Transacción de reembolso creada: ${transactionId}`);
        } else {
          console.log(`ℹ️ No se encontró booking de subsidio del instructor`);
        }
      }

      // ♻️ PLAZAS RECICLADAS: COBRAR inmediatamente y crear como CONFIRMED
      // PLAZAS NORMALES: Crear como PENDING con amountBlocked
      const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const bookingStatus = isRecycledSlot ? 'CONFIRMED' : 'PENDING';
      
      // 💰 Calcular valores según método de pago
      // ♻️ Si es reciclada: COBRAR puntos (0 bloqueados), si es normal: BLOQUEAR
      const pointsToCharge = (usePoints && isRecycledSlot) ? creditsCost : 0;
      const pointsToBlock = (usePoints && !isRecycledSlot) ? creditsCost : 0;
      // 💰 IMPORTANTE: pricePerSlot está en EUROS, pero amountBlocked debe guardarse en CÉNTIMOS
      const creditsToBlock = usePoints ? 0 : Math.round(pricePerSlot * 100); // Convertir euros a céntimos
      
      console.log(`💎 Creando booking (${bookingStatus}): paidWithPoints=${usePoints ? 1 : 0}, isRecycled=${isRecycledSlot}, pointsToCharge=${pointsToCharge}, pointsToBlock=${pointsToBlock}, creditsToBlock=${creditsToBlock} céntimos`);
      
      await prisma.$executeRaw`
        INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, amountBlocked, paidWithPoints, pointsUsed, isRecycled, createdAt, updatedAt)
        VALUES (${bookingId}, ${userId}, ${timeSlotId}, ${Number(groupSize) || 1}, ${bookingStatus}, ${creditsToBlock}, ${usePoints ? 1 : 0}, ${pointsToCharge}, 0, datetime('now'), datetime('now'))
      `;
      
      // 💎 Sistema de puntos eliminado - ahora todo usa créditos bloqueados
      // No hay lógica especial para usePoints, ambos casos usan créditos

      console.log('✅ Booking created successfully:', bookingId);

      // 🔒 ACTUALIZAR SALDO DEL USUARIO
      if (usePoints) {
        if (isRecycledSlot) {
          // ♻️ Plaza reciclada: COBRAR puntos inmediatamente
          await prisma.$executeRaw`
            UPDATE User 
            SET points = points - ${pointsToCharge}, updatedAt = datetime('now')
            WHERE id = ${userId}
          `;
          console.log(`💰 Usuario puntos COBRADOS: -${pointsToCharge} pts (plaza reciclada)`);
        } else {
          // Plaza normal: BLOQUEAR puntos
          await prisma.$executeRaw`
            UPDATE User 
            SET blockedPoints = blockedPoints + ${pointsToBlock}, updatedAt = datetime('now')
            WHERE id = ${userId}
          `;
          console.log(`🔒 Usuario blockedPoints actualizado: +${pointsToBlock} pts`);
        }
      } else {
        // Bloquear créditos
        const newBlockedAmount = await updateUserBlockedCredits(userId);
        console.log(`🔒 Usuario blockedCredits actualizado: €${(newBlockedAmount/100).toFixed(2)}`);
      }

      // 📝 REGISTRAR TRANSACCIÓN (siempre créditos bloqueados)
      const userBalance = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, blockedCredits: true }
      });
      
      if (userBalance) {
        if (usePoints) {
          // Transacción de PUNTOS (bloqueo o cargo según tipo de plaza)
          const userPoints = await prisma.user.findUnique({
            where: { id: userId },
            select: { points: true, blockedPoints: true }
          });
          
          if (userPoints) {
            if (isRecycledSlot) {
              // ♻️ Plaza reciclada: CARGO inmediato
              await createTransaction({
                userId,
                type: 'points',
                action: 'charge',
                amount: pointsToCharge,
                balance: userPoints.points,
                concept: `Reserva confirmada con puntos (plaza reciclada) - Clase ${new Date(slotDetails[0].start).toLocaleString('es-ES')}`,
                relatedId: bookingId,
                relatedType: 'booking',
                metadata: {
                  timeSlotId,
                  isRecycledSlot: true
                }
              });
            } else {
              // Plaza normal: BLOQUEO
              await createTransaction({
                userId,
                type: 'points',
                action: 'block',
                amount: pointsToBlock,
                balance: userPoints.points - (userPoints.blockedPoints || 0),
                concept: `Reserva pendiente con puntos - Clase ${new Date(slotDetails[0].start).toLocaleString('es-ES')}`,
                relatedId: bookingId,
                relatedType: 'booking',
                metadata: {
                  timeSlotId,
                  groupSize,
                  status: 'PENDING',
                  paidWithPoints: true,
                  pointsBlocked: pointsToBlock
                }
              });
            }
          }
        } else {
          // Transacción de bloqueo de créditos (en céntimos)
          await createTransaction({
            userId,
            type: 'credit',
            action: 'block',
            amount: creditsToBlock, // Ya está en céntimos
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
      // REGLA CRÍTICA: La primera persona que se inscribe determina la categoría (masculino/femenino)
      // NOTA: La categoría es INFORMATIVA, no restrictiva. Cualquier usuario puede inscribirse.
      console.log(`🔍 isFirstBooking = ${isFirstBooking}`);
      
      if (isFirstBooking) {
        console.log('🏷️ ===== FIRST BOOKING DETECTED =====');
        console.log('🏷️ Classifying TimeSlot based on first user gender and level...');
        
        // Obtener el género del usuario
        const userInfo = await prisma.$queryRaw`
          SELECT gender, level FROM User WHERE id = ${userId}
        ` as Array<{gender: string | null, level: string | null}>;
        
        const userGender = userInfo[0]?.gender;
        const userLevelStr = userInfo[0]?.level;
        const userLevel = userLevelStr ? parseFloat(userLevelStr) : null;
        
        console.log(`   👤 Usuario género: ${userGender || 'NO DEFINIDO'}`);
        console.log(`   📊 Usuario nivel: ${userLevelStr} (numeric: ${userLevel})`);
        
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
        
        // 🎯 DETERMINAR RANGO DE NIVEL SEGÚN EL PRIMER USUARIO
        // Buscar en qué rango del instructor encaja el nivel del primer usuario inscrito
        let instructorLevelRange = 'ABIERTO'; // Por defecto si no hay rango configurado
        
        if (userLevel !== null && slotDetails[0].instructorId) {
          const instructorData = await prisma.$queryRaw`
            SELECT levelRanges FROM Instructor WHERE id = ${slotDetails[0].instructorId}
          ` as Array<{levelRanges: string | null}>;
          
          if (instructorData[0]?.levelRanges) {
            try {
              const ranges = JSON.parse(instructorData[0].levelRanges) as Array<{minLevel: number, maxLevel: number}>;
              console.log(`   📊 Rangos del instructor:`, ranges);
              
              const foundRange = findLevelRange(userLevel, ranges);
              if (foundRange) {
                instructorLevelRange = foundRange;
                console.log(`   🎯 Usuario nivel ${userLevel} → Rango asignado: ${instructorLevelRange}`);
              } else {
                console.log(`   ℹ️ Usuario nivel ${userLevel} no encaja en ningún rango del instructor - usando ABIERTO`);
              }
            } catch (e) {
              console.log(`   ⚠️ Error parsing instructor level ranges:`, e);
            }
          } else {
            console.log(`   ℹ️ Instructor no tiene rangos de nivel configurados - usando ABIERTO`);
          }
        } else if (userLevel === null) {
          console.log(`   ℹ️ Usuario sin nivel definido - usando ABIERTO`);
        }
        
        // Convertir género a categoría de clase (INFORMATIVO, no restrictivo)
        const classCategory = userGender === 'masculino' ? 'masculino' : 
                            userGender === 'femenino' ? 'femenino' : 
                            'ABIERTO';
        
        console.log(`   🏷️ ASIGNANDO categoría: ${classCategory.toUpperCase()}`);
        console.log(`   🏷️ MANTENIENDO nivel como rango del instructor: ${instructorLevelRange}`);
        
        // ✅ ACTUALIZAR EL TIMESLOT CON LA CATEGORÍA Y EL RANGO DEL INSTRUCTOR
        // IMPORTANTE: El campo "level" debe mantener el RANGO del instructor, NO el nivel del jugador
        // El campo "levelRange" se mantiene para compatibilidad
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET genderCategory = ${classCategory}, 
              level = ${instructorLevelRange},
              levelRange = ${instructorLevelRange},
              updatedAt = datetime('now')
          WHERE id = ${timeSlotId}
        `;
        
        console.log(`   ✅ TimeSlot actualizado: level=${instructorLevelRange}, genderCategory=${classCategory}`);
        
        // Verificar que se haya actualizado correctamente
        const verifyUpdate = await prisma.$queryRaw`
          SELECT genderCategory, level, levelRange FROM TimeSlot WHERE id = ${timeSlotId}
        ` as Array<{genderCategory: string | null, level: string | null, levelRange: string | null}>;
        
        console.log(`   🔍 Verificación: genderCategory=${verifyUpdate[0]?.genderCategory}, level=${verifyUpdate[0]?.level}, levelRange=${verifyUpdate[0]?.levelRange}`);
        
        if (verifyUpdate[0]?.genderCategory !== classCategory) {
          console.log(`   ⚠️ WARNING: La categoría no se actualizó correctamente`);
        }

      }

      // 🆕 GARANTIZAR TARJETA ABIERTO DISPONIBLE (SIEMPRE, NO SOLO EN PRIMERA RESERVA)
      // Esto se ejecuta en CADA reserva para asegurar que siempre haya una alternativa ABIERTO
      console.log('🆕 Ensuring ABIERTO slot exists for this timeslot...');
      
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
            AND (genderCategory IS NULL OR genderCategory = 'ABIERTO')
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
                genderCategory: 'ABIERTO',
                category: slot.category,
                courtId: null,
                courtNumber: null
              }
            });

            console.log(`   ✅ ABIERTO slot created: ${newSlot.id}`);
            console.log(`   🏁 Alternative available: [ABIERTO/ABIERTO] for timeslot ${new Date(Number(slot.start)).toLocaleTimeString()}`);
          } else {
            console.log(`   ℹ️ ABIERTO slot already exists (${existingOpen[0].id})`);
          }
        }
      } catch (createError) {
        console.error('   ⚠️ Error ensuring ABIERTO slot:', createError);
      }

      // 🏁 SISTEMA DE CARRERAS: Verificar si alguna modalidad se completa
      console.log('🏁 RACE SYSTEM: Checking if any group option is complete...');
      
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

      // 🎁 CONTAR PLAZAS INDIVIDUALES: Para cada modalidad (1,2,3,4), contar cuántas plazas hay
      // Una plaza individual cuenta como 1/N de esa modalidad
      const totalSlotsBooked = allBookingsForSlot.reduce((sum, b) => sum + b.groupSize, 0);
      console.log(`🎁 Total slots booked: ${totalSlotsBooked} / ${slotDetails[0].maxPlayers}`);
      
      // Verificar cada opción de grupo para ver si alguna está completa
      let raceWinner: number | null = null;
      let courtAssigned: number | null = null;
      
      // 🎫 RESERVA PRIVADA: Gana automáticamente la carrera
      if (isPrivate) {
        console.log(`   🎫 PRIVATE RESERVATION WINS! Auto-completing race for ${groupSize} players`);
        raceWinner = groupSize;
      } else {
        // 🎁 VERIFICAR MODALIDADES INCLUYENDO PLAZAS INDIVIDUALES
        // Para cada modalidad posible (1, 2, 3, 4), verificar si se completó
        for (let modalidad = 1; modalidad <= 4; modalidad++) {
          // Contar bookings normales de esta modalidad (cada booking = 1 persona)
          const bookingsNormales = bookingsByGroupSize.get(modalidad) || 0;
          
          // Contar bookings individuales (groupSize=1 que llenan esta modalidad)
          // Solo si la modalidad es mayor que 1 (las individuales pueden llenar modalidades 2,3,4)
          let plazasIndividuales = 0;
          if (modalidad > 1) {
            // Contar cuántas plazas individuales hay (groupSize=1)
            plazasIndividuales = bookingsByGroupSize.get(1) || 0;
          }
          
          // Total de plazas para esta modalidad
          // IMPORTANTE: Cada booking = 1 persona, NO multiplicar por modalidad
          // Ejemplo: 2 bookings con groupSize=2 = 2 personas (completa modalidad 2)
          const totalPlazas = bookingsNormales + plazasIndividuales;
          
          console.log(`   🔍 Modalidad ${modalidad} jugadores: ${bookingsNormales} bookings + ${plazasIndividuales} individuales = ${totalPlazas}/${modalidad} plazas`);
          
          // Si esta modalidad se completó (tiene suficientes plazas)
          if (totalPlazas >= modalidad) {
            console.log(`   ✅ WINNER! Modalidad ${modalidad} jugador(es) COMPLETADA!`);
            raceWinner = modalidad;
            break;
          }
        }
      }
      
      // Si hay un ganador, procesar confirmación y cobro
      if (raceWinner !== null) {
          
          console.log(`   💰 PROCESSING WINNER - Confirming and charging winning bookings...`);
          
          // ✅ PASO 1: CONFIRMAR Y COBRAR RESERVAS GANADORAS (SIEMPRE, independiente de si hay pista)
          // 🎁 Si la modalidad ganadora fue completada con plazas individuales, confirmar todos los bookings involucrados
          let winningBookings;
          
          if (raceWinner === 1) {
            // Modalidad de 1 jugador: solo confirmar bookings con groupSize=1
            winningBookings = allBookingsForSlot.filter(b => b.groupSize === 1);
          } else {
            // Modalidad de 2, 3 o 4: confirmar bookings normales de esa modalidad + individuales si los hay
            const bookingsNormales = allBookingsForSlot.filter(b => b.groupSize === raceWinner);
            const bookingsIndividuales = allBookingsForSlot.filter(b => b.groupSize === 1);
            
            // Si hay bookings individuales, confirmar todos (normales + individuales)
            if (bookingsIndividuales.length > 0) {
              winningBookings = [...bookingsNormales, ...bookingsIndividuales];
            } else {
              // Solo hay bookings normales
              winningBookings = bookingsNormales;
            }
          }
          
          console.log(`   ✅ Winning bookings (modalidad ${raceWinner} jugadores):`, winningBookings.length);
          
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
              select: { amountBlocked: true, paidWithPoints: true, pointsUsed: true, userId: true }
            });
            
            const amountToCharge = bookingInfo?.amountBlocked || 0;
            const isPaidWithPoints = bookingInfo?.paidWithPoints || false;
            const pointsToCharge = bookingInfo?.pointsUsed || 0;
            
            if (isPaidWithPoints) {
              // 💎 COBRAR PUNTOS
              console.log(`      💎 Cobrando ${pointsToCharge} puntos al usuario ${booking.userId}`);
              
              // Obtener balance actual de puntos antes de cobrar
              const userBeforeCharge = await prisma.user.findUnique({
                where: { id: booking.userId },
                select: { points: true, blockedLoyaltyPoints: true }
              });
              
              await prisma.$executeRaw`
                UPDATE User 
                SET points = points - ${pointsToCharge}, updatedAt = datetime('now')
                WHERE id = ${booking.userId}
              `;
              
              // ✅ Actualizar booking a CONFIRMED
              await prisma.$executeRaw`
                UPDATE Booking 
                SET status = 'CONFIRMED', updatedAt = datetime('now')
                WHERE id = ${booking.id}
              `;
              
              // 📝 REGISTRAR TRANSACCIÓN DE COBRO DE PUNTOS
              if (userBeforeCharge) {
                // Calcular saldo disponible (puntos totales - bloqueados)
                const availableBalance = userBeforeCharge.points - (userBeforeCharge.blockedLoyaltyPoints || 0);
                await createTransaction({
                  userId: booking.userId,
                  type: 'points',
                  action: 'subtract',
                  amount: pointsToCharge,
                  balance: availableBalance,
                  concept: `Clase confirmada con puntos - ${slotDetailsForCharging.length > 0 ? new Date(slotDetailsForCharging[0].start).toLocaleString('es-ES') : 'N/A'}`,
                  relatedId: booking.id,
                  relatedType: 'booking',
                  metadata: {
                    timeSlotId,
                    groupSize: booking.groupSize,
                    status: 'CONFIRMED',
                    paidWithPoints: true
                  }
                });
              }
              
              console.log(`      ✅ Confirmed and charged ${pointsToCharge} points to user ${booking.userId}`);
            } else {
              // 💳 COBRAR CRÉDITOS
              // Obtener balance actual antes de cobrar
              const userBeforeCharge = await prisma.user.findUnique({
                where: { id: booking.userId },
                select: { credits: true, blockedCredits: true }
              });
              
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
              
              // 📝 REGISTRAR TRANSACCIÓN DE COBRO DE CRÉDITOS
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
                    status: 'CONFIRMED',
                    paidWithCredits: true
                  }
                });
              }
              
              console.log(`      ✅ Confirmed and charged €${(amountToCharge/100).toFixed(2)} to user ${booking.userId}`);
            }
            console.log(`      🔍 Verificando otras inscripciones del usuario ${booking.userId} para cancelar...`);
            await cancelOtherBookingsOnSameDay(booking.userId, timeSlotId, prisma);
          }
          
          // ❌ PASO 2: CANCELAR RESERVAS PERDEDORAS
          const losingBookings = allBookingsForSlot.filter(b => b.groupSize !== raceWinner);
          console.log(`   ❌ Losing bookings to cancel:`, losingBookings.length);
          
          for (const booking of losingBookings) {
            const bookingInfo = await prisma.booking.findUnique({
              where: { id: booking.id },
              select: { amountBlocked: true, paidWithPoints: true, pointsUsed: true, userId: true, status: true }
            });
            
            const amountBlocked = bookingInfo?.amountBlocked || 0;
            const isPaidWithPoints = bookingInfo?.paidWithPoints || false;
            const pointsBlocked = bookingInfo?.pointsUsed || 0;
            const wasConfirmed = bookingInfo?.status === 'CONFIRMED';
            
            await prisma.$executeRaw`
              UPDATE Booking 
              SET status = 'CANCELLED', updatedAt = datetime('now')
              WHERE id = ${booking.id}
            `;
            
            if (wasConfirmed) {
              // 🎁 Otorgar puntos de compensación (solo si pagó con créditos)
              if (!isPaidWithPoints) {
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
                // Si pagó con puntos y ya estaba confirmado, devolver los puntos
                console.log(`      💎 Devolviendo ${pointsBlocked} puntos ya cobrados al usuario ${booking.userId}`);
                
                await prisma.$executeRaw`
                  UPDATE User
                  SET points = points + ${pointsBlocked}, updatedAt = datetime('now')
                  WHERE id = ${booking.userId}
                `;
                
                const userAfterRefund = await prisma.user.findUnique({
                  where: { id: booking.userId },
                  select: { points: true }
                });
                
                if (userAfterRefund) {
                  await createTransaction({
                    userId: booking.userId,
                    type: 'points',
                    action: 'add',
                    amount: pointsBlocked,
                    balance: userAfterRefund.points,
                    concept: `Devolución de puntos - Otra modalidad completó primero`,
                    relatedId: booking.id,
                    relatedType: 'booking',
                    metadata: {
                      timeSlotId,
                      groupSize: booking.groupSize,
                      status: 'CANCELLED',
                      reason: 'Clase confirmada cancelada - Otra modalidad ganó la carrera',
                      pointsRefunded: pointsBlocked
                    }
                  });
                }
              }
            } else {
              // CLASE PENDIENTE - Desbloquear créditos o puntos
              if (isPaidWithPoints) {
                // Desbloquear puntos
                console.log(`      💎 Desbloqueando ${pointsBlocked} puntos del usuario ${booking.userId}`);
                
                await prisma.$executeRaw`
                  UPDATE User
                  SET blockedPoints = blockedPoints - ${pointsBlocked}, updatedAt = datetime('now')
                  WHERE id = ${booking.userId}
                `;
                
                const userAfterUnblock = await prisma.user.findUnique({
                  where: { id: booking.userId },
                  select: { points: true, blockedPoints: true }
                });
                
                if (userAfterUnblock) {
                  await createTransaction({
                    userId: booking.userId,
                    type: 'points',
                    action: 'unblock',
                    amount: pointsBlocked,
                    balance: userAfterUnblock.points - userAfterUnblock.blockedPoints,
                    concept: `Puntos desbloqueados - Opción ${booking.groupSize} jugadores no completada`,
                    relatedId: booking.id,
                    relatedType: 'booking',
                    metadata: {
                      timeSlotId,
                      groupSize: booking.groupSize,
                      status: 'CANCELLED',
                      reason: 'Otra modalidad ganó la carrera',
                      pointsUnblocked: pointsBlocked
                    }
                  });
                }
              } else {
                // Desbloquear créditos
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
            }
            
            console.log(`      ❌ Cancelled booking ${booking.id} (${booking.groupSize} players)`);
          }
          
          console.log(`   ✅ Winning bookings charged, losing bookings cancelled`);
          
          // 🔄 VERIFICAR SI LA TARJETA SE QUEDÓ SIN USUARIOS (después de cancelar perdedores)
          await resetSlotCategoryIfEmpty(timeSlotId);
          
          // ❌ PASO 2.5: CANCELAR BOOKINGS EN TARJETAS DUPLICADAS (COPIAS)
          // Buscar TODAS las tarjetas con mismo instructor y hora (excluyendo esta)
          console.log(`\n   🔍 PASO 2.5: Buscando tarjetas duplicadas (copias) para cancelar...`);
          
          const slotDetailsForDuplicates = await prisma.$queryRaw`
            SELECT start, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
          ` as Array<{start: number | bigint, instructorId: string}>;
          
          if (slotDetailsForDuplicates.length > 0) {
            const { start: slotStart, instructorId } = slotDetailsForDuplicates[0];
            
            console.log(`      📊 Instructor: ${instructorId}`);
            console.log(`      ⏰ Hora: ${new Date(Number(slotStart)).toLocaleString('es-ES')}`);
            
            // Buscar tarjetas duplicadas (mismo instructor, misma hora, diferente ID)
            const duplicateSlots = await prisma.$queryRaw`
              SELECT id, level, genderCategory 
              FROM TimeSlot
              WHERE instructorId = ${instructorId}
              AND start = ${slotStart}
              AND id != ${timeSlotId}
              AND courtId IS NULL
            ` as Array<{id: string, level: string | null, genderCategory: string | null}>;
            
            console.log(`      📋 Tarjetas duplicadas encontradas: ${duplicateSlots.length}`);
            
            if (duplicateSlots.length > 0) {
              // Listar las tarjetas encontradas
              duplicateSlots.forEach((slot, i) => {
                console.log(`         ${i+1}. ${slot.id.substring(0, 15)}... (${slot.level || 'SIN NIVEL'}, ${slot.genderCategory || 'SIN CATEGORÍA'})`);
              });
              
              // Obtener TODOS los bookings de estas tarjetas duplicadas
              const duplicateSlotIds = duplicateSlots.map(s => s.id);
              
              for (const duplicateSlotId of duplicateSlotIds) {
                const bookingsInDuplicate = await prisma.$queryRaw`
                  SELECT id, userId, groupSize, status, amountBlocked, paidWithPoints, pointsUsed
                  FROM Booking
                  WHERE timeSlotId = ${duplicateSlotId}
                  AND status IN ('PENDING', 'CONFIRMED')
                ` as Array<{
                  id: string, 
                  userId: string, 
                  groupSize: number, 
                  status: string, 
                  amountBlocked: number | bigint,
                  paidWithPoints: number,
                  pointsUsed: number | bigint
                }>;
                
                console.log(`      👥 Bookings en tarjeta ${duplicateSlotId.substring(0, 15)}: ${bookingsInDuplicate.length}`);
                
                // Cancelar cada booking y devolver créditos/puntos
                for (const booking of bookingsInDuplicate) {
                  const amountBlocked = Number(booking.amountBlocked);
                  const isPaidWithPoints = booking.paidWithPoints === 1;
                  const pointsBlocked = Number(booking.pointsUsed);
                  const wasConfirmed = booking.status === 'CONFIRMED';
                  
                  console.log(`         ❌ Cancelando booking ${booking.id.substring(0, 10)} de usuario ${booking.userId.substring(0, 10)} (${booking.groupSize}p)`);
                  
                  // Cancelar el booking
                  await prisma.$executeRaw`
                    UPDATE Booking 
                    SET status = 'CANCELLED', updatedAt = datetime('now')
                    WHERE id = ${booking.id}
                  `;
                  
                  if (wasConfirmed) {
                    // Si estaba CONFIRMED (ya cobrado), devolver o compensar
                    if (!isPaidWithPoints) {
                      // Otorgar puntos de compensación
                      const newPoints = await grantCompensationPoints(booking.userId, amountBlocked);
                      const pointsGranted = Math.floor(amountBlocked / 100);
                      
                      console.log(`            🎁 Otorgados ${pointsGranted} puntos de compensación al usuario ${booking.userId.substring(0, 10)}`);
                      
                      await createTransaction({
                        userId: booking.userId,
                        type: 'points',
                        action: 'add',
                        amount: pointsGranted,
                        balance: newPoints,
                        concept: `Compensación - Otra tarjeta completó primero`,
                        relatedId: booking.id,
                        relatedType: 'booking',
                        metadata: {
                          timeSlotId: duplicateSlotId,
                          groupSize: booking.groupSize,
                          status: 'CANCELLED',
                          reason: 'Tarjeta duplicada - Otra clase ganó la carrera',
                          originalAmount: amountBlocked
                        }
                      });
                    } else {
                      // Devolver puntos
                      console.log(`            💎 Devolviendo ${pointsBlocked} puntos al usuario ${booking.userId.substring(0, 10)}`);
                      
                      await prisma.$executeRaw`
                        UPDATE User
                        SET points = points + ${pointsBlocked}, updatedAt = datetime('now')
                        WHERE id = ${booking.userId}
                      `;
                      
                      const userAfterRefund = await prisma.user.findUnique({
                        where: { id: booking.userId },
                        select: { points: true }
                      });
                      
                      if (userAfterRefund) {
                        await createTransaction({
                          userId: booking.userId,
                          type: 'points',
                          action: 'add',
                          amount: pointsBlocked,
                          balance: userAfterRefund.points,
                          concept: `Devolución - Otra tarjeta completó primero`,
                          relatedId: booking.id,
                          relatedType: 'booking',
                          metadata: {
                            timeSlotId: duplicateSlotId,
                            groupSize: booking.groupSize,
                            status: 'CANCELLED',
                            reason: 'Tarjeta duplicada - Otra clase ganó la carrera',
                            pointsRefunded: pointsBlocked
                          }
                        });
                      }
                    }
                  } else {
                    // Si estaba PENDING, desbloquear
                    if (isPaidWithPoints) {
                      // Desbloquear puntos
                      console.log(`            💎 Desbloqueando ${pointsBlocked} puntos del usuario ${booking.userId.substring(0, 10)}`);
                      
                      await prisma.$executeRaw`
                        UPDATE User
                        SET blockedPoints = blockedPoints - ${pointsBlocked}, updatedAt = datetime('now')
                        WHERE id = ${booking.userId}
                      `;
                      
                      const userAfterUnblock = await prisma.user.findUnique({
                        where: { id: booking.userId },
                        select: { points: true, blockedPoints: true }
                      });
                      
                      if (userAfterUnblock) {
                        await createTransaction({
                          userId: booking.userId,
                          type: 'points',
                          action: 'unblock',
                          amount: pointsBlocked,
                          balance: userAfterUnblock.points - userAfterUnblock.blockedPoints,
                          concept: `Puntos desbloqueados - Tarjeta duplicada cancelada`,
                          relatedId: booking.id,
                          relatedType: 'booking',
                          metadata: {
                            timeSlotId: duplicateSlotId,
                            groupSize: booking.groupSize,
                            status: 'CANCELLED',
                            reason: 'Otra tarjeta ganó la carrera',
                            pointsUnblocked: pointsBlocked
                          }
                        });
                      }
                    } else {
                      // Desbloquear créditos
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
                          concept: `Reserva cancelada - Tarjeta duplicada cancelada`,
                          relatedId: booking.id,
                          relatedType: 'booking',
                          metadata: {
                            timeSlotId: duplicateSlotId,
                            groupSize: booking.groupSize,
                            status: 'CANCELLED',
                            reason: 'Otra tarjeta ganó la carrera'
                          }
                        });
                      }
                    }
                  }
                }
                
                // Eliminar la tarjeta duplicada después de cancelar todos sus bookings
                console.log(`      🗑️ Eliminando tarjeta duplicada ${duplicateSlotId.substring(0, 15)}...`);
                await prisma.$executeRaw`
                  DELETE FROM TimeSlot WHERE id = ${duplicateSlotId}
                `;
                console.log(`      ✅ Tarjeta eliminada`);
              }
              
              console.log(`   ✅ Todas las tarjetas duplicadas procesadas y eliminadas`);
            } else {
              console.log(`   ℹ️ No se encontraron tarjetas duplicadas`);
            }
          }
          
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
                // 🚨 IMPORTANTE: SQLite usa INTEGER timestamps, trabajar directamente con números
                const currentStart = slotDetails[0].start; // Ya es timestamp numérico
                const currentEnd = slotDetails[0].end; // Ya es timestamp numérico
                const durationMinutes = (Number(currentEnd) - Number(currentStart)) / (1000 * 60);
                
                console.log(`   📏 Duración actual del slot: ${durationMinutes} minutos`);
                
                // Si el slot es de 30 minutos, extenderlo a 60 minutos
                if (durationMinutes === 30) {
                  const newEndTimestamp = Number(currentStart) + (60 * 60 * 1000); // +60 minutos
                  const currentEndDisplay = new Date(Number(currentEnd)).toISOString();
                  const newEndDisplay = new Date(newEndTimestamp).toISOString();
                  console.log(`   🔄 Extendiendo slot de 30min a 60min: ${currentEndDisplay} → ${newEndDisplay}`);
                  
                  await prisma.$executeRaw`
                    UPDATE TimeSlot 
                    SET end = ${newEndTimestamp}, courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
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
                // 🚨 IMPORTANTE: SQLite almacena timestamps como INTEGER, NO usar .toISOString()
                const confirmedStart = slotDetailsForDeletion[0].start; // Ya es timestamp
                const confirmedEnd = slotDetailsForDeletion[0].end; // Ya es timestamp
                const instructorId = slotDetailsForDeletion[0].instructorId;
                
                const startDisplay = new Date(confirmedStart).toISOString();
                const endDisplay = new Date(confirmedEnd).toISOString();
                console.log(`      🔍 Buscando propuestas entre ${startDisplay} y ${endDisplay}`);
                console.log(`      📊 Timestamps: start=${confirmedStart}, end=${confirmedEnd}`);
                
                // Eliminar TODAS las propuestas del mismo instructor que solapen con esta clase de 60 min
                // Esto incluye las 2 propuestas de 30 min que conforman la hora completa
                const deletedProposals = await prisma.$executeRaw`
                  DELETE FROM TimeSlot
                  WHERE instructorId = ${instructorId}
                  AND courtId IS NULL
                  AND id != ${timeSlotId}
                  AND (
                    (start >= ${confirmedStart} AND start < ${confirmedEnd})
                    OR (end > ${confirmedStart} AND end <= ${confirmedEnd})
                    OR (start <= ${confirmedStart} AND end >= ${confirmedEnd})
                  )
                `;
                
                console.log(`      ✅ Deleted ${deletedProposals} overlapping proposals (from ${new Date(confirmedStart).toLocaleTimeString()} to ${new Date(confirmedEnd).toLocaleTimeString()})`);
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
                const endDate = new Date(end);
                const dateStr = startDate.toISOString().split('T')[0];
                
                // Calcular los 3 bloques de 30 min que deben marcarse como ocupados:
                // 1. Buffer de 30 min ANTES de la clase
                // 2. Primer bloque de 30 min de la clase
                // 3. Segundo bloque de 30 min de la clase
                const bufferStart = new Date(startDate.getTime() - 30 * 60 * 1000); // 30 min antes
                const firstBlockEnd = new Date(startDate.getTime() + 30 * 60 * 1000); // start + 30 min
                const secondBlockEnd = new Date(startDate.getTime() + 60 * 60 * 1000); // start + 60 min (= end)
                
                // Bloques a crear (cada uno de 30 min)
                const blocks = [
                  { start: bufferStart.toISOString(), end: startDate.toISOString(), reason: 'Buffer pre-clase (30 min)' },
                  { start: startDate.toISOString(), end: firstBlockEnd.toISOString(), reason: 'Clase confirmada (0-30 min)' },
                  { start: firstBlockEnd.toISOString(), end: secondBlockEnd.toISOString(), reason: 'Clase confirmada (30-60 min)' }
                ];
                
                console.log(`      📅 Bloqueando 3 bloques de 30 min (buffer + clase completa)`);
                
                // Obtener el courtId de la pista asignada
                const courtInfo = await prisma.$queryRaw`
                  SELECT id FROM Court WHERE number = ${courtAssigned} LIMIT 1
                ` as Array<{id: string}>;
                
                if (courtInfo && courtInfo.length > 0) {
                  const courtId = courtInfo[0].id;
                  
                  // Marcar PISTA como ocupada en los 3 bloques
                  for (const block of blocks) {
                    const courtScheduleId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    // ✅ Usar INSERT OR IGNORE para prevenir errores de constraint duplicado
                    await prisma.$executeRaw`
                      INSERT OR IGNORE INTO CourtSchedule (
                        id, courtId, date, startTime, endTime, 
                        isOccupied, timeSlotId, reason, createdAt, updatedAt
                      )
                      VALUES (
                        ${courtScheduleId},
                        ${courtId},
                        ${dateStr},
                        ${block.start},
                        ${block.end},
                        1,
                        ${timeSlotId},
                        ${block.reason},
                        datetime('now'),
                        datetime('now')
                      )
                    `;
                  }
                  console.log(`      ✅ Court ${courtAssigned} marked as occupied (3 blocks: buffer + 60 min class)`);
                }
                
                // Marcar INSTRUCTOR como ocupado en los 3 bloques
                if (instructorId) {
                  for (const block of blocks) {
                    const instructorScheduleId = `is_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    // ✅ Usar INSERT OR IGNORE para prevenir errores de constraint duplicado
                    await prisma.$executeRaw`
                      INSERT OR IGNORE INTO InstructorSchedule (
                        id, instructorId, date, startTime, endTime,
                        isOccupied, timeSlotId, reason, createdAt, updatedAt
                      )
                      VALUES (
                        ${instructorScheduleId},
                        ${instructorId},
                        ${dateStr},
                        ${block.start},
                        ${block.end},
                        1,
                        ${timeSlotId},
                        ${block.reason},
                        datetime('now'),
                        datetime('now')
                      )
                    `;
                  }
                  console.log(`      ✅ Instructor marked as occupied (3 blocks: buffer + 60 min class)`);
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

      // 🐛 DEBUG: Verificar que level está presente en updatedSlotData
      if (updatedSlotData) {
        console.log('📦 updatedSlotData siendo devuelto al frontend:', {
          id: updatedSlotData.id?.substring(0, 15),
          level: updatedSlotData.level,
          levelRange: updatedSlotData.levelRange,
          genderCategory: updatedSlotData.genderCategory,
          bookingsCount: updatedSlotData.bookings?.length || 0
        });
      }

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
