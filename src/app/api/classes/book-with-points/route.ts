// src/app/api/classes/book-with-points/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateUserBlockedLoyaltyPoints } from '@/lib/blockedCredits';
import { createTransaction } from '@/lib/transactionLogger';

/**
 * ♻️ ENDPOINT EXCLUSIVO PARA RESERVAR PLAZAS RECICLADAS CON PUNTOS
 * 
 * Este endpoint permite reservar SOLO plazas que fueron liberadas por cancelaciones.
 * Características:
 * - Solo acepta pago con PUNTOS (no con saldo)
 * - Solo para TimeSlots con hasRecycledSlots = true
 * - El usuario que canceló puede volver a reservar (día desbloqueado)
 * - Otros usuarios del mismo nivel también pueden reservar
 * - Coste: Precio normal de la clase en puntos (1€ = 1 punto)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timeSlotId, userId, groupSize = 2 } = body;

    console.log('♻️ RESERVA DE PLAZA RECICLADA CON PUNTOS:', { timeSlotId, userId, groupSize });

    // 1️⃣ VERIFICAR QUE EL TIMESLOT TIENE PLAZAS RECICLADAS
    const timeSlotQuery = await prisma.$queryRaw`
      SELECT 
        id, clubId, instructorId, start, end, maxPlayers, 
        totalPrice, courtId, courtNumber, hasRecycledSlots, level
      FROM TimeSlot 
      WHERE id = ${timeSlotId}
    ` as Array<{
      id: string;
      clubId: string;
      instructorId: string;
      start: number | bigint;
      end: number | bigint;
      maxPlayers: number;
      totalPrice: number;
      courtId: string | null;
      courtNumber: number | null;
      hasRecycledSlots: number;
      level: string;
    }>;

    if (timeSlotQuery.length === 0) {
      return NextResponse.json({ 
        error: 'Clase no encontrada' 
      }, { status: 404 });
    }

    const timeSlot = timeSlotQuery[0];

    // ⚠️ VALIDACIÓN CRÍTICA: Debe tener plazas recicladas
    if (!timeSlot.hasRecycledSlots || timeSlot.hasRecycledSlots === 0) {
      return NextResponse.json({ 
        error: 'Esta clase no tiene plazas recicladas disponibles. Solo se pueden reservar con puntos las plazas liberadas por cancelaciones.' 
      }, { status: 400 });
    }

    console.log(`✅ Clase tiene plazas recicladas (hasRecycledSlots: ${timeSlot.hasRecycledSlots})`);

    // 2️⃣ VERIFICAR PLAZAS DISPONIBLES (excluyendo canceladas)
    const activeBookingsQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM Booking
      WHERE timeSlotId = ${timeSlotId}
      AND status != 'CANCELLED'
    ` as Array<{ count: number }>;

    const activeBookingsCount = Number(activeBookingsQuery[0].count);
    const availableSlots = timeSlot.maxPlayers - activeBookingsCount;

    console.log(`📊 Plazas: ${activeBookingsCount}/${timeSlot.maxPlayers} ocupadas, ${availableSlots} disponibles`);

    if (availableSlots <= 0) {
      return NextResponse.json({ 
        error: 'No hay plazas disponibles en esta clase' 
      }, { status: 400 });
    }

    // 3️⃣ VERIFICAR QUE EL USUARIO NO TIENE YA UN BOOKING ACTIVO EN ESTA CLASE
    const existingBookingQuery = await prisma.$queryRaw`
      SELECT id, status, groupSize
      FROM Booking
      WHERE userId = ${userId}
      AND timeSlotId = ${timeSlotId}
      AND status IN ('PENDING', 'CONFIRMED')
    ` as Array<{ id: string; status: string; groupSize: number }>;

    if (existingBookingQuery.length > 0) {
      return NextResponse.json({ 
        error: 'Ya tienes una reserva activa en esta clase' 
      }, { status: 400 });
    }

    // 4️⃣ VERIFICAR QUE EL USUARIO TIENE SUFICIENTES PUNTOS
    const userQuery = await prisma.$queryRaw`
      SELECT id, name, email, points, blockedLoyaltyPoints, level
      FROM User
      WHERE id = ${userId}
    ` as Array<{
      id: string;
      name: string;
      email: string;
      points: number;
      blockedLoyaltyPoints: number;
      level: string;
    }>;

    if (userQuery.length === 0) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado' 
      }, { status: 404 });
    }

    const user = userQuery[0];
    const pointsCost = Math.floor(timeSlot.totalPrice); // 1€ = 1 punto
    const availablePoints = user.points - user.blockedLoyaltyPoints;

    console.log(`💎 Coste en puntos: ${pointsCost}, Usuario tiene: ${availablePoints} puntos disponibles`);

    if (availablePoints < pointsCost) {
      return NextResponse.json({ 
        error: `No tienes suficientes puntos. Necesitas ${pointsCost} puntos y tienes ${availablePoints} disponibles.` 
      }, { status: 400 });
    }

    // 5️⃣ VERIFICAR SI EL USUARIO TIENE BOOKING CONFIRMADO ESE DÍA (EXCLUIR SI CANCELÓ)
    const slotTimestamp = typeof timeSlot.start === 'bigint' ? Number(timeSlot.start) : timeSlot.start;
    const slotDate = new Date(slotTimestamp);
    const startOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDayDate = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 23, 59, 59, 999));
    const startTimestamp = startOfDayDate.getTime();
    const endTimestamp = endOfDayDate.getTime();

    const confirmedBookingsTodayQuery = await prisma.$queryRaw`
      SELECT b.id, ts.start, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status = 'CONFIRMED'
      AND ts.start >= ${startTimestamp}
      AND ts.start <= ${endTimestamp}
    ` as Array<{ id: string; start: number | bigint; courtNumber: number }>;

    if (confirmedBookingsTodayQuery.length > 0) {
      const confirmedDate = new Date(Number(confirmedBookingsTodayQuery[0].start));
      const confirmedTime = confirmedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const courtNumber = confirmedBookingsTodayQuery[0].courtNumber;
      
      return NextResponse.json({ 
        error: `Ya tienes una reserva confirmada este día a las ${confirmedTime} (Pista ${courtNumber}). Solo puedes tener una reserva confirmada por día.` 
      }, { status: 400 });
    }

    // 6️⃣ CREAR BOOKING CON PUNTOS
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO Booking (
        id, userId, timeSlotId, groupSize, status,
        amountBlocked, paidWithPoints, pointsUsed,
        createdAt, updatedAt
      ) VALUES (
        ${bookingId},
        ${userId},
        ${timeSlotId},
        ${Number(groupSize)},
        ${timeSlot.courtNumber ? 'CONFIRMED' : 'PENDING'},
        0,
        1,
        ${pointsCost},
        ${now.toISOString()},
        ${now.toISOString()}
      )
    `;

    console.log(`✅ Booking creado: ${bookingId} (${pointsCost} puntos)`);

    // 7️⃣ BLOQUEAR PUNTOS DEL USUARIO
    const newBlockedPoints = await updateUserBlockedLoyaltyPoints(userId);
    console.log(`💎 Puntos bloqueados actualizados: ${newBlockedPoints}`);

    // 8️⃣ SI LA CLASE YA ESTÁ CONFIRMADA (tiene pista), COBRAR PUNTOS INMEDIATAMENTE
    if (timeSlot.courtNumber) {
      console.log(`🎾 Clase ya confirmada (pista ${timeSlot.courtNumber}), cobrando puntos...`);

      await prisma.$executeRaw`
        UPDATE User
        SET points = points - ${pointsCost},
            blockedLoyaltyPoints = blockedLoyaltyPoints - ${pointsCost},
            updatedAt = datetime('now')
        WHERE id = ${userId}
      `;

      // Registrar transacción
      const userAfterCharge = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true }
      });

      await createTransaction({
        userId,
        type: 'points',
        action: 'deduct',
        amount: pointsCost,
        balance: userAfterCharge?.points || 0,
        concept: `Reserva de plaza reciclada - Clase ${new Date(slotTimestamp).toLocaleString('es-ES')}`,
        relatedId: bookingId,
        relatedType: 'booking',
        metadata: {
          timeSlotId,
          groupSize: Number(groupSize),
          status: 'CONFIRMED',
          courtNumber: timeSlot.courtNumber,
          isRecycledSlot: true
        }
      });

      console.log(`💎 ${pointsCost} puntos cobrados`);
    } else {
      console.log(`⏳ Clase pendiente, puntos quedan bloqueados hasta confirmación`);
    }

    // 9️⃣ VERIFICAR SI LA CLASE SE COMPLETA CON ESTA RESERVA
    const newActiveCount = activeBookingsCount + 1;
    const isNowFull = newActiveCount >= timeSlot.maxPlayers;

    if (isNowFull && !timeSlot.courtNumber) {
      console.log(`🎯 Clase completada con esta reserva, pero falta lógica de asignación de pista`);
      // NOTA: La lógica de asignación de pista y cobro está en el endpoint principal de booking
      // Aquí solo registramos el booking, el sistema de race se encargará
    }

    return NextResponse.json({
      success: true,
      message: `Plaza reciclada reservada exitosamente con ${pointsCost} puntos. ${timeSlot.courtNumber ? `Pista ${timeSlot.courtNumber} asignada.` : 'La clase se confirmará cuando se complete el grupo.'}`,
      booking: {
        id: bookingId,
        timeSlotId,
        userId,
        groupSize: Number(groupSize),
        status: timeSlot.courtNumber ? 'CONFIRMED' : 'PENDING',
        pointsUsed: pointsCost,
        courtNumber: timeSlot.courtNumber,
        isRecycledSlot: true
      }
    });

  } catch (error) {
    console.error('❌ Error en book-with-points:', error);
    return NextResponse.json({ 
      error: 'Error al procesar la reserva con puntos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
